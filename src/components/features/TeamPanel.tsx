"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Video, MessageSquare, Users, X, Check, Copy, ExternalLink, ChevronDown,
} from "lucide-react";
import { canPerform, type UserRole } from "@/lib/permissions";
import { PageHeader } from "./PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useLabels } from "@/hooks/useLabels";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useOnlineStatus } from "@/hooks/usePresence";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image?: string | null;
};

type CreatedMeeting = {
  roomCode: string;
  meetingLink: string;
  title: string;
};

export function TeamPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, role: tRole } = useLabels();
  const userRole = (session?.user?.role || "GUEST") as UserRole;
  const currentId    = session?.user?.id || "";
  const canChangeRole = canPerform(userRole, "changeRoles");

  const [members,  setMembers]  = useState<Member[]>([]);
  const [showGroupMeet, setShowGroupMeet] = useState(false);
  const [meetTitle, setMeetTitle] = useState("");
  const [selected, setSelected]  = useState<Set<string>>(new Set());
  const [creating, setCreating]  = useState(false);
  const [created,  setCreated]   = useState<CreatedMeeting | null>(null);
  const [copied,   setCopied]    = useState(false);
  const online = useOnlineStatus(members.map((m) => m.id));

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then(setMembers);
  }, []);

  async function updateRole(userId: string, newRole: UserRole) {
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newRole }),
    });
    const res = await fetch("/api/team");
    setMembers(await res.json());
  }

  async function startSoloMeeting(member: Member) {
    const name = member.name || member.email.split("@")[0];
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Meeting with ${name}` }),
    });
    if (!res.ok) return;
    const data = await res.json();
    await fetch("/api/meetings/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode:       data.roomCode,
        meetingLink:    data.meetingLink,
        title:          `Meeting with ${name}`,
        participantIds: [member.id],
      }),
    });
    router.push(`/dashboard/meetings/room/${data.roomCode}`);
  }

  async function openDm(member: Member) {
    await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dm", targetUserId: member.id }),
    }).catch(() => null);
    router.push("/dashboard/discussion");
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(members.filter((m) => m.id !== currentId).map((m) => m.id)));
  }

  async function startGroupMeeting() {
    if (selected.size === 0) return;
    setCreating(true);
    const title = meetTitle.trim() || "Group Meeting";
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { setCreating(false); return; }
    const data = await res.json();
    await fetch("/api/meetings/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode:       data.roomCode,
        meetingLink:    data.meetingLink,
        title,
        participantIds: [...selected],
      }),
    });
    setCreating(false);
    setCreated({ roomCode: data.roomCode, meetingLink: data.meetingLink, title });
  }

  function copyLink() {
    if (!created) return;
    navigator.clipboard.writeText(created.meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeGroupMeet() {
    setShowGroupMeet(false);
    setSelected(new Set());
    setMeetTitle("");
    setCreated(null);
    setCopied(false);
  }

  return (
    <div>
      <PageHeader
        title={t("team.title")}
        description={`${members.length} ${t("team.members")} ${t("team.in_org")}`}
        help={t("team.help")}
        action={
          <button
            onClick={() => { setShowGroupMeet(true); setCreated(null); setSelected(new Set()); }}
            className="btn-primary"
          >
            <Video className="h-4 w-4" /> {t("team.group_meeting")}
          </button>
        }
      />

      {/* Group meeting modal */}
      {showGroupMeet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <Video className="h-4 w-4 text-[#5D3A8C]" /> {t("team.group_meeting")}
              </h2>
              <button onClick={closeGroupMeet} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!created ? (
              <>
                <input
                  className="input-field"
                  placeholder={t("team.meeting_title_placeholder")}
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  autoFocus
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-700">
                      {t("team.select_participants")} ({selected.size} {t("team.selected")})
                    </p>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-[#5D3A8C] hover:underline"
                    >
                      {t("team.select_all")}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 p-2">
                    {members.filter((m) => m.id !== currentId).map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer transition ${
                          selected.has(m.id) ? "bg-[#F3EEF8]" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-[#5D3A8C]"
                          checked={selected.has(m.id)}
                          onChange={() => toggleSelect(m.id)}
                        />
                        <UserAvatar
                          name={m.name}
                          email={m.email}
                          image={m.image}
                          size="sm"
                          online={online.has(m.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.name || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                        <span className="text-xs text-gray-400">{tRole(m.role)}</span>
                      </label>
                    ))}
                    {members.filter((m) => m.id !== currentId).length === 0 && (
                      <p className="px-3 py-4 text-sm text-center text-gray-400">
                        {t("team.no_other_members")}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500">{t("team.invite_hint")}</p>

                <div className="flex gap-2">
                  <button
                    onClick={startGroupMeeting}
                    disabled={selected.size === 0 || creating}
                    className="btn-primary flex-1"
                  >
                    <Video className="h-4 w-4" />
                    {creating ? t("general.loading") : `${t("meeting.start")} (${selected.size + 1})`}
                  </button>
                  <button onClick={closeGroupMeet} className="btn-secondary">{t("general.cancel")}</button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
                    <Check className="h-4 w-4" /> {t("team.meeting_created")}
                  </p>
                  <p className="text-xs text-green-700">
                    {t("team.invites_sent")} {selected.size} {t("team.participants")}.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">{t("meeting.copy_link")}</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      className="input-field text-xs font-mono flex-1"
                      value={created.meetingLink}
                    />
                    <button onClick={copyLink} className="btn-secondary shrink-0 px-3">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/meetings/room/${created.roomCode}`)}
                    className="btn-primary flex-1"
                  >
                    <ExternalLink className="h-4 w-4" /> {t("meeting.join")}
                  </button>
                  <button onClick={closeGroupMeet} className="btn-secondary">{t("general.close")}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F3EEF8] text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-[#5D3A8C]">{t("team.member_col")}</th>
              <th className="px-4 py-3 font-medium text-[#5D3A8C] hidden sm:table-cell">{t("team.email_col")}</th>
              <th className="px-4 py-3 font-medium text-[#5D3A8C]">{t("team.role_col")}</th>
              <th className="px-4 py-3 font-medium text-[#5D3A8C] text-right">{t("team.actions_col")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={m.name}
                      email={m.email}
                      image={m.image}
                      size="sm"
                      online={online.has(m.id)}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{m.name || "—"}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{m.email}</p>
                    </div>
                    {m.id === currentId && (
                      <span className="rounded-full bg-[#5D3A8C]/10 px-2 py-0.5 text-[10px] font-medium text-[#5D3A8C]">
                        {t("team.you")}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.email}</td>

                <td className="px-4 py-3">
                  {canChangeRole && m.id !== currentId ? (
                    <div className="relative inline-block">
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.id, e.target.value as UserRole)}
                        className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-1 text-sm cursor-pointer hover:border-[#5D3A8C] transition"
                      >
                        {(["OWNER", "ADMIN", "MEMBER", "GUEST"] as UserRole[]).map((r) => (
                          <option key={r} value={r}>{tRole(r)}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  ) : (
                    <Badge>{tRole(m.role)}</Badge>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {m.id !== currentId && (
                      <>
                        <button
                          onClick={() => openDm(m)}
                          title={`Message ${m.name || m.email}`}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:border-[#5D3A8C] hover:text-[#5D3A8C] transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("team.message")}</span>
                        </button>
                        <button
                          onClick={() => startSoloMeeting(m)}
                          title={`Start meeting with ${m.name || m.email}`}
                          className="flex items-center gap-1.5 rounded-lg bg-[#5D3A8C] px-2.5 py-1.5 text-xs text-white hover:bg-[#4a2d72] transition"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("discussion.meet")}</span>
                        </button>
                      </>
                    )}
                    {m.id === currentId && (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">{t("team.no_members")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
