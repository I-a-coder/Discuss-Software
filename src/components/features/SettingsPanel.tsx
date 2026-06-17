"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PageHeader } from "./PageHeader";
import type { UserRole } from "@/lib/permissions";
import { canPerform, getAccessibleFeatures } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLabels } from "@/hooks/useLabels";
import {
  AlertTriangle, Bug, MessageSquareWarning, Lightbulb, CheckCircle,
  Lock, Key, Shield, FileCheck,
} from "lucide-react";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

type AdminSettingsPayload = {
  organization: { id: string; name: string; slug: string; createdAt: string };
  counts: {
    usersByRole: { role: UserRole; _count: { role: number } }[];
    communities: number;
    activeMeetings: number;
    concernsOpen: number;
  };
  security: {
    encryptionKeyConfigured: boolean;
    aiApiConfigured: boolean;
    googleAuthConfigured: boolean;
    strictMode: boolean;
  };
  recentActivity: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { name: string | null; email: string | null } | null;
  }[];
};

type Report = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
};

const CONCERN_CATS = [
  { id: "feedback", icon: Lightbulb, label: "Feedback" },
  { id: "technical", icon: Bug, label: "Technical Issue" },
  { id: "concern", icon: AlertTriangle, label: "Concern" },
  { id: "other", icon: MessageSquareWarning, label: "Other" },
];

const SECURITY_CARDS = [
  { icon: Lock, title: "End-to-End Encryption", desc: "All messages, notes and meeting content is encrypted at rest with AES-256." },
  { icon: Key, title: "Encryption Key Management", desc: "Your ENCRYPTION_KEY in .env never leaves the server and is never stored in plain text." },
  { icon: Shield, title: "Role-Based Access Control", desc: "Owners, Admins, Members and Guests each have clearly scoped permissions across every feature." },
  { icon: FileCheck, title: "Audit Logs", desc: "Every significant action is logged with user, timestamp and details for accountability." },
];

const MATRIX_ROWS = [
  { label: "Post in discussion", perms: ["✓", "✓", "✓", "—"] },
  { label: "Read discussions", perms: ["✓", "✓", "✓", "✓"] },
  { label: "Whiteboard", perms: ["✓", "✓", "✓", "—"] },
  { label: "AI Chat", perms: ["✓", "✓", "✓", "—"] },
  { label: "Meetings", perms: ["✓", "✓", "✓", "—"] },
  { label: "Project Board", perms: ["✓", "✓", "✓", "—"] },
  { label: "Notes", perms: ["✓", "✓", "✓", "✓"] },
  { label: "Activity History", perms: ["✓", "✓", "✓", "✓"] },
  { label: "Team & Settings", perms: ["✓", "✓", "—", "—"] },
  { label: "Change Roles", perms: ["✓", "—", "—", "—"] },
];

type Tab = "general" | "concern" | "security";

export function SettingsPanel() {
  const { data: session, update: updateSession } = useSession();
  const { t, role, feature } = useLabels();
  const userRole = (session?.user?.role || "GUEST") as UserRole;
  const features = getAccessibleFeatures(userRole);
  const canManageSoftware = canPerform(userRole, "manageTeam");
  const canChangeRoles = canPerform(userRole, "changeRoles");
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const searchParams = useSearchParams();

  // Auto-open tab from ?tab= query param (used by redirects from /concerns and /security)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "concern" || tabParam === "security") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [members, setMembers] = useState<Member[]>([]);
  const [adminData, setAdminData] = useState<AdminSettingsPayload | null>(null);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Concern state
  const isAuthority = canPerform(userRole, "viewConcerns");
  const [reports, setReports] = useState<Report[]>([]);
  const [category, setCategory] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!canManageSoftware) return;
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []));
    fetch("/api/settings/admin")
      .then((r) => r.json())
      .then((d) => {
        setAdminData(d);
        setOrgNameDraft(d?.organization?.name || "");
      });
  }, [canManageSoftware]);

  useEffect(() => {
    if (activeTab !== "concern") return;
    fetch("/api/concerns")
      .then((r) => r.json())
      .then((d) => setReports(Array.isArray(d) ? d : []));
  }, [activeTab]);

  const roleCounts = useMemo(() => {
    if (!adminData) return {} as Record<string, number>;
    return Object.fromEntries(
      adminData.counts.usersByRole.map((x) => [x.role, x._count.role])
    ) as Record<string, number>;
  }, [adminData]);

  async function updateRole(userId: string, newRole: UserRole) {
    setMessage(null);
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newRole }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error || t("settings.could_not_role"));
      return;
    }
    const teamRes = await fetch("/api/team");
    setMembers(await teamRes.json());
    const settingsRes = await fetch("/api/settings/admin");
    const fresh = await settingsRes.json();
    setAdminData(fresh);
    setMessage(t("settings.role_updated"));
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
    setUploadingAvatar(false);
    if (!res.ok) {
      const body = await res.json();
      setMessage(body.error || t("settings.could_not_org"));
      return;
    }
    const { image } = await res.json();
    await updateSession({ image });
    setMessage(t("settings.org_updated"));
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    await fetch("/api/profile/avatar", { method: "DELETE" });
    await updateSession({ image: null });
    setUploadingAvatar(false);
    setMessage(t("settings.org_updated"));
  }

  async function saveOrganizationName() {
    if (!orgNameDraft.trim()) return;
    setSavingOrg(true);
    setMessage(null);
    const res = await fetch("/api/settings/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationName: orgNameDraft }),
    });
    const body = await res.json();
    setSavingOrg(false);
    if (!res.ok) {
      setMessage(body.error || t("settings.could_not_org"));
      return;
    }
    setMessage(t("settings.org_updated"));
    const settingsRes = await fetch("/api/settings/admin");
    setAdminData(await settingsRes.json());
  }

  async function submitConcern(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/concerns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, subject, description }),
    });
    if (res.ok) {
      setSent(true);
      setSubject("");
      setDescription("");
      const r = await fetch("/api/concerns");
      if (r.ok) setReports(await r.json());
      setTimeout(() => setSent(false), 4000);
    }
  }

  async function resolveConcern(id: string) {
    await fetch("/api/concerns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    const r = await fetch("/api/concerns");
    if (r.ok) setReports(await r.json());
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "general", label: "General & Profile" },
    { id: "concern", label: "Concern & Help" },
    { id: "security", label: "Security" },
  ];

  return (
    <div>
      <PageHeader
        title={t("settings.title")}
        description={
          canManageSoftware
            ? t("settings.desc_admin")
            : t("settings.desc_user")
        }
      />

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? "border-[#5D3A8C] text-[#5D3A8C]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL & PROFILE TAB ── */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900">{t("settings.profile")}</h3>
            <div className="mt-4 flex items-center gap-4">
              <UserAvatar
                name={session?.user?.name}
                email={session?.user?.email}
                image={session?.user?.image}
                size="lg"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {uploadingAvatar
                    ? t("settings.uploading")
                    : session?.user?.image
                      ? t("settings.change_photo")
                      : t("settings.upload_photo")}
                </button>
                {session?.user?.image && (
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    disabled={uploadingAvatar}
                    onClick={removeAvatar}
                  >
                    {t("settings.remove_photo")}
                  </button>
                )}
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("settings.name")}</dt>
                <dd>{session?.user?.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("auth.email")}</dt>
                <dd>{session?.user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("team.role_col")}</dt>
                <dd className="text-[#5D3A8C] font-medium">{role(userRole)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("dashboard.organization")}</dt>
                <dd>{session?.user?.organizationName || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900">{t("settings.language")}</h3>
            <p className="mt-1 text-sm text-gray-600">{t("settings.language_desc")}</p>
            <div className="mt-3 max-w-xs">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900">{t("settings.features_access")}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-[#F3EEF8] px-3 py-1 text-sm text-[#5D3A8C]"
                >
                  {feature(f)}
                </li>
              ))}
            </ul>
          </div>

          {canManageSoftware && (
            <>
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900">{t("settings.org_mgmt")}</h3>
                <p className="mt-1 text-sm text-gray-600">{t("settings.org_mgmt_desc")}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat title={t("settings.stat_owners")} value={String(roleCounts.OWNER || 0)} />
                  <Stat title={t("settings.stat_admins")} value={String(roleCounts.ADMIN || 0)} />
                  <Stat title={t("settings.stat_members")} value={String(roleCounts.MEMBER || 0)} />
                  <Stat title={t("settings.stat_guests")} value={String(roleCounts.GUEST || 0)} />
                  <Stat title={t("settings.stat_communities")} value={String(adminData?.counts.communities || 0)} />
                  <Stat title={t("settings.stat_live_meetings")} value={String(adminData?.counts.activeMeetings || 0)} />
                  <Stat title={t("settings.stat_open_concerns")} value={String(adminData?.counts.concernsOpen || 0)} />
                  <Stat title={t("settings.stat_org_slug")} value={adminData?.organization.slug || t("general.na")} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    className="input-field max-w-md"
                    value={orgNameDraft}
                    onChange={(e) => setOrgNameDraft(e.target.value)}
                    placeholder={t("settings.org_name_placeholder")}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={saveOrganizationName}
                    disabled={savingOrg}
                  >
                    {savingOrg ? t("settings.saving") : t("settings.update_org")}
                  </button>
                </div>
                {message && <p className="mt-2 text-sm text-[#5D3A8C]">{message}</p>}
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-900">{t("settings.member_access")}</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-3">{t("settings.name")}</th>
                        <th className="py-2 pr-3">{t("auth.email")}</th>
                        <th className="py-2 pr-3">{t("team.role_col")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-gray-100">
                          <td className="py-2 pr-3">{m.name || t("settings.unnamed")}</td>
                          <td className="py-2 pr-3 text-gray-600">{m.email}</td>
                          <td className="py-2 pr-3">
                            {canChangeRoles && m.id !== session?.user?.id ? (
                              <select
                                value={m.role}
                                onChange={(e) => updateRole(m.id, e.target.value as UserRole)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                              >
                                {(["OWNER", "ADMIN", "MEMBER", "GUEST"] as UserRole[]).map((r) => (
                                  <option key={r} value={r}>{role(r)}</option>
                                ))}
                              </select>
                            ) : (
                              <Badge>{role(m.role)}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-900">{t("settings.security_checks")}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SecurityCheck title={t("settings.encryption_key")} ok={!!adminData?.security.encryptionKeyConfigured} okLabel={t("settings.ok")} needsLabel={t("settings.needs_setup")} />
                  <SecurityCheck title={t("settings.ai_provider")} ok={!!adminData?.security.aiApiConfigured} okLabel={t("settings.ok")} needsLabel={t("settings.needs_setup")} />
                  <SecurityCheck title={t("settings.google_sso")} ok={!!adminData?.security.googleAuthConfigured} okLabel={t("settings.ok")} needsLabel={t("settings.needs_setup")} />
                  <SecurityCheck title={t("settings.production_strict")} ok={!!adminData?.security.strictMode} okLabel={t("settings.ok")} needsLabel={t("settings.needs_setup")} />
                </div>
                <p className="mt-3 text-xs text-gray-500">{t("settings.security_note")}</p>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-900">{t("settings.recent_activity")}</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(adminData?.recentActivity || []).map((log) => (
                    <li key={log.id} className="rounded-lg border border-gray-100 p-2">
                      <p className="font-medium text-gray-900">{log.action}</p>
                      <p className="text-gray-600">{log.details || t("settings.no_details")}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()} {t("general.by")}{" "}
                        {log.user?.name || log.user?.email || t("settings.by_system")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900">{t("settings.ai_assistant_config")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("settings.ai_desc")}</p>
            <pre className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 overflow-x-auto">
{`AI_API_KEY=your-groq-or-openai-key
AI_API_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=optional-for-whisper`}
            </pre>
          </div>
        </div>
      )}

      {/* ── CONCERN & HELP TAB ── */}
      {activeTab === "concern" && (
        <div className="space-y-6">
          {sent && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Your report has been submitted. Thank you!
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={submitConcern} className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Submit a Report or Request Help</h3>
              <div className="grid grid-cols-2 gap-2">
                {CONCERN_CATS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                        category === c.id
                          ? "border-[#5D3A8C] bg-[#F3EEF8] text-[#5D3A8C]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <input
                className="input-field"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <textarea
                className="input-field min-h-[140px]"
                placeholder="Describe your issue or feedback in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full">
                Submit Report
              </button>
            </form>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {isAuthority ? "All Reports" : "Your Submissions"}
              </h3>
              <ul className="space-y-3 max-h-[480px] overflow-y-auto">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{r.subject}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {r.status === "open" ? "Open" : "Resolved"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {r.category} {isAuthority && `· ${r.user.name || r.user.email}`} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{r.description}</p>
                    {isAuthority && r.status === "open" && (
                      <button
                        type="button"
                        onClick={() => resolveConcern(r.id)}
                        className="mt-2 text-xs text-[#5D3A8C] underline"
                      >
                        Mark as resolved
                      </button>
                    )}
                  </li>
                ))}
                {reports.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No reports yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {SECURITY_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card p-6">
                  <Icon className="mb-3 h-8 w-8 text-[#5D3A8C]" />
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="card p-6 bg-[#F3EEF8]/50">
            <h3 className="font-semibold text-[#5D3A8C]">Permission Matrix</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#5D3A8C]">
                    <th className="py-2 pr-4">Feature</th>
                    <th className="py-2 px-2">Owner</th>
                    <th className="py-2 px-2">Admin</th>
                    <th className="py-2 px-2">Member</th>
                    <th className="py-2 px-2">Guest</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {MATRIX_ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-gray-200">
                      <td className="py-2 pr-4">{row.label}</td>
                      {row.perms.map((c, i) => (
                        <td key={i} className="py-2 px-2 text-center">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SecurityCheck({
  title, ok, okLabel, needsLabel,
}: {
  title: string; ok: boolean; okLabel: string; needsLabel: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${
      ok ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
    }`}>
      <span className="font-medium">{ok ? okLabel : needsLabel}</span>
      <span className="ml-2">{title}</span>
    </div>
  );
}
