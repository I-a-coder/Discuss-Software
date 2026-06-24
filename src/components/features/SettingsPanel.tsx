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
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertTriangle, Bug, MessageSquareWarning, Lightbulb, CheckCircle,
  Lock, Key, Shield, FileCheck, Calendar, RefreshCw, Unlink, ExternalLink, Pencil,
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

type Tab = "general" | "concern" | "security" | "calendar";

export function SettingsPanel() {
  const { data: session, update: updateSession } = useSession();
  const { t, role, feature } = useLabels();
  const { td } = useLanguage();
  const userRole = (session?.user?.role || "GUEST") as UserRole;
  const features = getAccessibleFeatures(userRole);
  const canManageSoftware = canPerform(userRole, "manageTeam");
  const canChangeRoles = canPerform(userRole, "changeRoles");
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const searchParams = useSearchParams();

  // Auto-open tab from ?tab= query param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "concern" || tabParam === "security" || tabParam === "calendar") {
      setActiveTab(tabParam as Tab);
    }
  }, [searchParams]);
  const [members, setMembers] = useState<Member[]>([]);
  const [adminData, setAdminData] = useState<AdminSettingsPayload | null>(null);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (session?.user?.name && !profileNameDraft) {
      setProfileNameDraft(session.user.name);
    }
  }, [session?.user?.name]);

  // Calendar sync state
  type CalendarStatus = { connected: boolean; tokenStatus: string | null };
  const [calStatus, setCalStatus] = useState<{
    google: CalendarStatus;
    microsoft: CalendarStatus;
  }>({ google: { connected: false, tokenStatus: null }, microsoft: { connected: false, tokenStatus: null } });
  const [calLoading, setCalLoading] = useState(false);
  const [calMessage, setCalMessage] = useState<string | null>(null);

  // Show success/error banners from OAuth redirect query params
  useEffect(() => {
    const connected = searchParams.get("calendarConnected");
    const err       = searchParams.get("calendarError");
    if (connected) {
      setCalMessage(`✓ ${connected === "google" ? "Google Calendar" : "Microsoft 365"} connected successfully!`);
      setActiveTab("calendar");
    } else if (err) {
      setCalMessage(`⚠ Calendar connection failed: ${err.replace(/_/g, " ")}`);
      setActiveTab("calendar");
    }
  }, [searchParams]);

  // Load calendar connection status whenever the tab is active
  useEffect(() => {
    if (activeTab !== "calendar") return;
    setCalLoading(true);
    fetch("/api/calendar-sync/status")
      .then((r) => r.json())
      .then((d) => setCalStatus(d.connections))
      .catch(() => {})
      .finally(() => setCalLoading(false));
  }, [activeTab]);

  async function disconnectCalendar(provider: "google" | "microsoft") {
    await fetch("/api/calendar-sync/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setCalStatus((prev) => ({
      ...prev,
      [provider]: { connected: false, tokenStatus: null },
    }));
    setCalMessage(`${provider === "google" ? "Google Calendar" : "Microsoft 365"} disconnected.`);
  }

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

  async function saveProfileName() {
    if (!profileNameDraft.trim()) return;
    setSavingProfile(true);
    setMessage(null);
    const res = await fetch("/api/profile/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileNameDraft }),
    });
    if (res.ok) {
      const { user } = await res.json();
      await updateSession({ name: user.name });
      setMessage(td("Profile updated successfully"));
    } else {
      setMessage(td("Failed to update profile"));
    }
    setSavingProfile(false);
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
    { id: "general",  label: "General & Profile" },
    { id: "calendar", label: "Calendar Sync" },
    { id: "concern",  label: "Concern & Help" },
    ...(features.includes("encryption") ? [{ id: "security" as Tab, label: "Security" }] : []),
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
              <button
                type="button"
                className="relative group shrink-0 rounded-full overflow-hidden border border-transparent hover:border-[#5D3A8C]/20 transition"
                onClick={() => avatarInputRef.current?.click()}
                title="Edit profile photo"
              >
                <UserAvatar
                  name={session?.user?.name}
                  email={session?.user?.email}
                  image={session?.user?.image}
                  size="lg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-4 w-4 text-white" />
                </div>
              </button>
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
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">{t("settings.name")}</dt>
                <dd className="flex items-center gap-2">
                  <input
                    className="input-field py-1 px-2 text-sm max-w-[200px]"
                    value={profileNameDraft}
                    onChange={(e) => setProfileNameDraft(e.target.value)}
                    placeholder={td("Your name")}
                  />
                  <button
                    type="button"
                    className="btn-primary py-1 px-3 text-xs"
                    onClick={saveProfileName}
                    disabled={savingProfile || profileNameDraft === session?.user?.name}
                  >
                    {td("Save")}
                  </button>
                </dd>
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
        </div>
      )}

      {/* ── CONCERN & HELP TAB ── */}
      {activeTab === "concern" && (
        <div className="space-y-6">
          {sent && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> {td("Your report has been submitted. Thank you!")}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={submitConcern} className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">{td("Submit a Report or Request Help")}</h3>
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
                placeholder={td("Subject")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <textarea
                className="input-field min-h-[140px]"
                placeholder={td("Describe your issue or feedback in detail…")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full">
                {td("Submit Report")}
              </button>
            </form>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {isAuthority ? td("All Reports") : td("Your Submissions")}
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
                        {r.status === "open" ? td("Open") : td("Resolved")}
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
            <h3 className="font-semibold text-[#5D3A8C]">{td("Permission Matrix")}</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#5D3A8C]">
                    <th className="py-2 pr-4">{td("Feature")}</th>
                    <th className="py-2 px-2">{td("Owner")}</th>
                    <th className="py-2 px-2">{td("Admin")}</th>
                    <th className="py-2 px-2">{td("Member")}</th>
                    <th className="py-2 px-2">{td("Guest")}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {MATRIX_ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-gray-200">
                      <td className="py-2 pr-4">{td(row.label)}</td>
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

      {/* ── CALENDAR SYNC TAB ── */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          {/* Feedback banner */}
          {calMessage && (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              calMessage.startsWith("✓")
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              {calMessage.startsWith("✓") ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{calMessage}</span>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-1">
              <Calendar className="h-6 w-6 text-[#5D3A8C]" />
              <h3 className="font-semibold text-gray-900 text-lg">{td("Calendar Sync")}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {td("Connect your calendar so meetings you schedule in Discuss automatically appear on your calendar and attendees receive real calendar invites. No action needed from invitees.")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Google Calendar card */}
              <CalendarProviderCard
                loading={calLoading}
                name="Google Calendar"
                icon="https://www.gstatic.com/images/branding/product/1x/calendar_48dp.png"
                status={calStatus.google}
                onConnect={() => { window.location.href = "/api/calendar-sync/connect?provider=google"; }}
                onDisconnect={() => disconnectCalendar("google")}
                scopeNote="Requests: calendar.events (create / edit / cancel events)"
              />

              {/* Microsoft 365 / Outlook card */}
              <CalendarProviderCard
                loading={calLoading}
                name="Microsoft 365 / Outlook"
                icon="https://res.cdn.office.net/assets/mail/pwa/v3/olk_64.png"
                status={calStatus.microsoft}
                onConnect={() => { window.location.href = "/api/calendar-sync/connect?provider=microsoft"; }}
                onDisconnect={() => disconnectCalendar("microsoft")}
                scopeNote="Requests: Calendars.ReadWrite"
              />
            </div>
          </div>

          <div className="card p-6 bg-[#F3EEF8]/40 border-[#5D3A8C]/10">
            <h4 className="font-semibold text-[#5D3A8C] mb-2">{td("How it works")}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="text-[#5D3A8C] font-bold">1.</span> {td("Connect your calendar above (only you, the organizer, need to do this).")}</li>
              <li className="flex gap-2"><span className="text-[#5D3A8C] font-bold">2.</span> {td("When you schedule a meeting in the Meetings → Schedule tab, a calendar event is automatically created on your calendar.")}</li>
              <li className="flex gap-2"><span className="text-[#5D3A8C] font-bold">3.</span> {td("Attendees you add receive a native calendar invite at their email. They don't need a Yusi Discuss account.")}</li>
              <li className="flex gap-2"><span className="text-[#5D3A8C] font-bold">4.</span> {td("If you edit or cancel the meeting, the calendar event is updated automatically.")}</li>
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              {td("Your OAuth tokens are encrypted server-side with AES-256-GCM and never shared. Reverse sync (calendar edits reflecting back into Discuss) is a planned future feature.")}
            </p>
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

/**
 * Inline SVG provider logos — never depend on external CDN availability.
 */
function ProviderIcon({ name }: { name: string; icon: string }) {
  const isGoogle = name.toLowerCase().includes("google");

  if (isGoogle) {
    // Google Calendar: blue square with white "31"
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a73e8] text-white font-bold text-[11px] shrink-0 select-none shadow-sm">
        31
      </span>
    );
  }

  // Microsoft: classic 4-square logo
  return (
    <svg viewBox="0 0 21 21" className="h-8 w-8 shrink-0" aria-label="Microsoft">
      <rect x="1" y="1"  width="9" height="9" fill="#f25022" rx="0.5" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" rx="0.5" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" rx="0.5" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" rx="0.5" />
    </svg>
  );
}

function CalendarProviderCard({
  loading,
  name,
  icon,
  status,
  onConnect,
  onDisconnect,
  scopeNote,
}: {
  loading: boolean;
  name: string;
  icon: string;
  status: { connected: boolean; tokenStatus: string | null };
  onConnect: () => void;
  onDisconnect: () => void;
  scopeNote: string;
}) {
  const isRevoked = status.connected && status.tokenStatus === "revoked";

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition ${
      status.connected && !isRevoked
        ? "border-green-200 bg-green-50/40"
        : isRevoked
          ? "border-amber-200 bg-amber-50/40"
          : "border-gray-200 bg-white"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <ProviderIcon name={name} icon={icon} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{scopeNote}</p>
        </div>
      </div>

      {/* Revoked token warning */}
      {isRevoked && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-100 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Your calendar access was revoked or expired.{" "}
            <button
              type="button"
              onClick={onConnect}
              className="font-semibold underline hover:no-underline"
            >
              Reconnect
            </button>{" "}
            to restore sync.
          </span>
        </div>
      )}

      {/* Status badge */}
      {!loading && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          status.connected && !isRevoked
            ? "text-green-700"
            : isRevoked
              ? "text-amber-700"
              : "text-gray-400"
        }`}>
          <span className={`inline-block h-2 w-2 rounded-full ${
            status.connected && !isRevoked
              ? "bg-green-500"
              : isRevoked
                ? "bg-amber-400"
                : "bg-gray-300"
          }`} />
          {status.connected && !isRevoked
            ? "Connected"
            : isRevoked
              ? "Token expired"
              : "Not connected"}
        </div>
      )}

      {loading && (
        <p className="text-xs text-gray-400 animate-pulse">Checking status…</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-auto">
        {status.connected ? (
          <>
            {isRevoked && (
              <button
                type="button"
                onClick={onConnect}
                className="btn-primary text-xs py-2 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reconnect
              </button>
            )}
            <button
              type="button"
              onClick={onDisconnect}
              className="btn-secondary text-xs py-2 flex items-center gap-1.5 text-red-600 hover:text-red-700"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="btn-primary text-xs py-2 flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Connect {name}
          </button>
        )}
      </div>
    </div>
  );
}

