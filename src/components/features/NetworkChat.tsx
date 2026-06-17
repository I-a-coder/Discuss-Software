"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Hash, Lock, MessageSquarePlus, Search, Users, Plus,
  Video, Phone, X, Loader2, UserPlus, Mail, CheckCircle2,
} from "lucide-react";
import { canPerform, type UserRole } from "@/lib/permissions";
import {
  canPostInChannel,
  isAnnouncementsChannel,
} from "@/lib/channel-permissions";
import { PageHeader } from "./PageHeader";
import { ChatComposer } from "@/components/ui/ChatComposer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCall } from "@/contexts/CallContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useOnlineStatus } from "@/hooks/usePresence";
import { isImageMime, isVideoMime } from "@/lib/upload-client";

type Thread = {
  id: string;
  type: string;
  name?: string | null;
  displayName?: string;
  channelId?: string | null;
  otherUser?: { id: string; name: string | null; email: string; image?: string | null };
};

type Channel = {
  id: string;
  name: string;
  slug: string;
  mode?: string;
  ownerId?: string | null;
  adminIds?: string | null;
  thread?: { id: string } | null;
};

type Community = {
  id: string;
  name: string;
  description: string | null;
  channels: Channel[];
};

type ChatMsg = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string; image?: string | null };
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  reactions?: { emoji: string; userId: string }[];
};

type OrgUser = { id: string; name: string | null; email: string; role: string; image?: string | null };
type MessageFilter = "all" | "chat" | "images" | "media";

export function NetworkChat() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { ringUser, ringMeeting } = useCall();
  const role = (session?.user?.role || "GUEST") as UserRole;
  const canPost = canPerform(role, "postDiscussion");
  const canManage = canPerform(role, "manageCommunities");
  const userId = session?.user?.id;

  const [filter, setFilter] = useState<"chats" | "channels">("chats");
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<OrgUser[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [dmThreads, setDmThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newChannelName, setNewChannelName] = useState("General");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Meeting state ──
  const [showMeetingConfirm, setShowMeetingConfirm] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState(false);

  // ── Add member state ──
  const [addMemberCommunity, setAddMemberCommunity] = useState<Community | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberResult, setAddMemberResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Direct call state ──
  const [calling, setCalling] = useState(false);
  const online = useOnlineStatus(people.map((p) => p.id));

  const filteredMessages = messages.filter((m) => {
    if (messageFilter === "all") return true;
    if (messageFilter === "chat") {
      return !m.attachmentPath && !!(m.content?.trim());
    }
    if (messageFilter === "images") {
      return m.attachmentMime && isImageMime(m.attachmentMime);
    }
    if (messageFilter === "media") {
      return (
        m.attachmentMime &&
        (isVideoMime(m.attachmentMime) ||
          (!isImageMime(m.attachmentMime) && !isVideoMime(m.attachmentMime)))
      );
    }
    return true;
  });

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/chat/threads");
    if (res.ok) {
      const data = await res.json();
      setCommunities(data.communities || []);
      setDmThreads(data.dmThreads || []);
    }
  }, []);

  const searchPeople = useCallback(async (q: string) => {
    const res = await fetch(`/api/chat/users?q=${encodeURIComponent(q)}`);
    if (res.ok) setPeople(await res.json());
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/chat/messages?threadId=${threadId}`);
    if (res.ok) setMessages(await res.json());
  }, []);

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 20000);
    return () => clearInterval(t);
  }, [loadThreads]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = search.trim();
    if (q.length < 2) {
      setPeople([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      searchPeople(q);
    }, 250);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, searchPeople]);

  useEffect(() => {
    if (activeThread?.id) {
      loadMessages(activeThread.id);
      const t = setInterval(() => loadMessages(activeThread.id), 12000);
      return () => clearInterval(t);
    }
  }, [activeThread?.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openDm(targetUserId: string) {
    setActiveChannel(null);
    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dm", targetUserId }),
    });
    if (res.ok) {
      const thread = await res.json();
      const u = people.find((p) => p.id === targetUserId);
      setActiveThread({
        ...thread,
        displayName: u?.name || u?.email || "Chat",
        otherUser: u,
      });
      setFilter("chats");
      loadThreads();
    }
  }

  async function openChannel(ch: Channel) {
    setActiveChannel(ch);
    let threadId = ch.thread?.id;
    if (!threadId) {
      const res = await fetch("/api/chat/threads");
      const data = await res.json();
      const comm = (data.communities as Community[]).find((c) =>
        c.channels.some((x) => x.id === ch.id)
      );
      const channel = comm?.channels.find((x) => x.id === ch.id);
      threadId = channel?.thread?.id;
      if (channel) setActiveChannel(channel);
    }
    if (threadId) {
      setActiveThread({
        id: threadId,
        type: "channel",
        name: ch.name,
        displayName: `# ${ch.name}`,
        channelId: ch.id,
      });
    }
  }

  const canPostHere =
    activeChannel && userId
      ? canPostInChannel(activeChannel, userId, role)
      : canPost;

  const reactOnlyChannel =
    activeChannel &&
    isAnnouncementsChannel(activeChannel) &&
    !canPostHere &&
    canPerform(role, "readDiscussion");

  async function reactToMessage(messageId: string, emoji: string) {
    await fetch("/api/chat/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (activeThread?.id) loadMessages(activeThread.id);
  }

  async function createCommunity() {
    const res = await fetch("/api/chat/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCommName,
        channelName: newChannelName,
      }),
    });
    if (res.ok) {
      setShowNewCommunity(false);
      setNewCommName("");
      loadThreads();
    }
  }

  async function sendMemberInvite() {
    if (!addMemberCommunity || !addMemberEmail.trim()) return;
    setAddMemberLoading(true);
    setAddMemberResult(null);
    try {
      const res = await fetch(`/api/chat/communities/${addMemberCommunity.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addMemberEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddMemberResult({
          ok: true,
          msg: `${t("meeting.invite_sent")} — ${data.invitedUser?.name || addMemberEmail}`,
        });
        setAddMemberEmail("");
      } else {
        setAddMemberResult({ ok: false, msg: data.error || t("discussion.invite_failed") });
      }
    } finally {
      setAddMemberLoading(false);
    }
  }

  /** Place a phone call (audio only, camera off) to the active DM partner */
  async function placePhoneCall() {
    if (!activeThread?.otherUser?.id) return;
    setCalling(true);
    try {
      await ringUser(
        activeThread.otherUser.id,
        "audio",
        `${session?.user?.name || t("general.system")} ${t("discussion.calling_you")}`
      );
    } finally {
      setCalling(false);
    }
  }

  async function sendMessage(payload: {
    content: string;
    attachmentPath?: string;
    attachmentName?: string;
    attachmentMime?: string;
  }) {
    if (!activeThread?.id) return;
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeThread.id, ...payload }),
    });
    loadMessages(activeThread.id);
  }

  // ── Start meeting from chat ──
  async function startMeetingFromChat() {
    setStartingMeeting(true);
    try {
      // 1. Create meeting
      const title =
        activeThread?.type === "dm"
          ? `Meeting with ${activeThread.displayName}`
          : `${activeThread?.displayName ?? "Channel"} Meeting`;

      const meetRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!meetRes.ok) return;
      const meeting = await meetRes.json();

      // 2. Collect participant IDs
      let participantIds: string[] = [];
      if (activeThread?.type === "dm" && activeThread.otherUser) {
        participantIds = [activeThread.otherUser.id];
      } else {
        // For a channel, invite all org users
        const usersRes = await fetch("/api/chat/users?q=");
        if (usersRes.ok) {
          const orgUsers: OrgUser[] = await usersRes.json();
          participantIds = orgUsers.map((u) => u.id);
        }
      }

      // 3. Ring all participants (calling overlay + ringtone on their side)
      if (participantIds.length > 0) {
        await ringMeeting({
          participantIds,
          roomCode: meeting.roomCode,
          meetingLink: meeting.meetingLink,
          title: meeting.title,
        });

        // 4. Send DM invites with meeting link
        await fetch("/api/meetings/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: meeting.roomCode,
            meetingLink: meeting.meetingLink,
            title: meeting.title,
            participantIds,
          }),
        });
      }

      // Caller sees outgoing calling window — join via overlay when ready
    } finally {
      setStartingMeeting(false);
      setShowMeetingConfirm(false);
    }
  }

  const meetingLabel =
    activeThread?.type === "dm"
      ? `${t("discussion.meet")} ${activeThread.displayName}`
      : `${t("discussion.meeting_in")} ${activeThread?.displayName ?? t("discussion.channel")}`;

  return (
    <div>
      <PageHeader
        title={t("discussion.title")}
        description={t("discussion.desc")}
        help={t("discussion.help")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => { setFilter("channels"); setShowNewCommunity(true); }}
                className="btn-primary text-xs py-2"
              >
                <Plus className="h-3.5 w-3.5" /> {t("discussion.new_community")}
              </button>
            )}
            <Link href="/dashboard/meetings" className="btn-secondary text-xs py-2">
              <Video className="h-3.5 w-3.5" /> {t("discussion.new_meeting")}
            </Link>
            <span className="flex items-center gap-1 text-xs text-[#5D3A8C]">
              <Lock className="h-3 w-3" /> {t("discussion.encrypted")}
            </span>
          </div>
        }
      />

      <div className="card flex h-[calc(100vh-200px)] min-h-[520px] overflow-hidden">
        {/* Left — Teams-style sidebar */}
        <aside className="w-72 shrink-0 border-r border-gray-100 flex flex-col bg-[#FAFAFA]">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field text-sm py-2.5"
                style={{ paddingLeft: '2.25rem' }}
                placeholder={t("discussion.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search && people.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                {people.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openDm(p.id)}
                      className="w-full px-3 py-2 text-left hover:bg-[#F3EEF8] flex items-center gap-2"
                    >
                      <UserAvatar
                        name={p.name}
                        email={p.email}
                        image={p.image}
                        size="sm"
                        online={online.has(p.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name || p.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500 truncate">{p.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-1 p-2">
            <button
              type="button"
              onClick={() => setFilter("chats")}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
                filter === "chats"
                  ? "bg-[#5D3A8C] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t("discussion.chats")}
            </button>
            <button
              type="button"
              onClick={() => setFilter("channels")}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
                filter === "channels"
                  ? "bg-[#5D3A8C] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t("discussion.channels")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {filter === "chats" && (
              <>
                <p className="px-2 text-[10px] font-semibold uppercase text-gray-400">
                  {t("discussion.dm")}
                </p>
                {dmThreads.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setActiveThread(th)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-left ${
                      activeThread?.id === th.id
                        ? "bg-[#F3EEF8] text-[#5D3A8C]"
                        : "hover:bg-white"
                    }`}
                  >
                    <UserAvatar
                      name={th.displayName}
                      email={th.otherUser?.email}
                      image={th.otherUser?.image}
                      size="sm"
                      online={th.otherUser ? online.has(th.otherUser.id) : false}
                    />
                    <span className="truncate font-medium">{th.displayName}</span>
                  </button>
                ))}
                {dmThreads.length === 0 && (
                  <p className="px-2 text-xs text-gray-500">
                    {t("discussion.search")}
                  </p>
                )}
              </>
            )}

            {filter === "channels" && (
              <>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCommunity(true)}
                    className="w-full flex items-center gap-2 rounded-xl border border-dashed border-[#5D3A8C]/40 px-3 py-2.5 text-sm font-medium text-[#5D3A8C] hover:bg-[#F3EEF8]"
                  >
                    <Plus className="h-4 w-4" /> {t("discussion.new_community")}
                  </button>
                ) : (
                  <p className="px-2 text-xs text-gray-500">{t("discussion.create_community_hint")}</p>
                )}
                {communities.length === 0 && canManage && (
                  <p className="px-2 text-xs text-gray-500">{t("discussion.no_channels")}</p>
                )}
                {communities.map((comm) => (
                  <div key={comm.id}>
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {comm.name}
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => { setAddMemberCommunity(comm); setAddMemberEmail(""); setAddMemberResult(null); }}
                          title={t("discussion.add_member")}
                          className="rounded-lg p-0.5 text-gray-400 hover:text-[#5D3A8C] hover:bg-[#F3EEF8] transition"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {comm.channels.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => openChannel(ch)}
                        className={`w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                          activeThread?.channelId === ch.id
                            ? "bg-[#F3EEF8] text-[#5D3A8C] font-medium"
                            : "text-gray-700 hover:bg-white"
                        }`}
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        {ch.name}
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Right — conversation */}
        <div className="flex flex-1 flex-col min-w-0">
          {activeThread ? (
            <>
              {/* Chat header with meeting + direct call buttons */}
              <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {activeThread.displayName || activeThread.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {activeThread.type === "dm"
                      ? t("discussion.direct_chat")
                      : reactOnlyChannel
                        ? t("discussion.announcements_only")
                        : t("discussion.channel")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeThread.type === "dm" && activeThread.otherUser ? (
                    <>
                      <button
                        onClick={placePhoneCall}
                        disabled={calling}
                        title={t("meeting.audio_call")}
                        className="group flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all disabled:opacity-40"
                      >
                        <Phone className="h-4 w-4" />
                        <span className="text-xs font-medium">{t("discussion.call")}</span>
                      </button>
                      <button
                        onClick={() => setShowMeetingConfirm(true)}
                        title={t("meetings.start_meeting")}
                        className="flex items-center gap-1.5 rounded-xl border border-[#5D3A8C]/30 bg-[#F3EEF8] px-2.5 py-1.5 text-xs font-medium text-[#5D3A8C] hover:bg-[#5D3A8C] hover:text-white transition-all"
                      >
                        <Video className="h-4 w-4" />
                        <span>{t("discussion.meet")}</span>
                      </button>
                    </>
                  ) : (
                    /* Channel: group Meet button only */
                    <button
                      onClick={() => setShowMeetingConfirm(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#5D3A8C]/30 bg-[#F3EEF8] px-3 py-1.5 text-xs font-medium text-[#5D3A8C] hover:bg-[#5D3A8C] hover:text-white transition-all"
                      title={t("meetings.start_meeting")}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {t("discussion.meet")}
                    </button>
                  )}
                  <MessageSquarePlus className="h-5 w-5 text-gray-300 ml-1" />
                </div>
              </div>

              <div className="border-b border-gray-100 px-4 py-2 flex gap-1 flex-wrap">
                {(["all", "chat", "images", "media"] as MessageFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setMessageFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      messageFilter === f
                        ? "bg-[#5D3A8C] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-[#F3EEF8]"
                    }`}
                  >
                    {t(`discussion.filter_${f}` as "discussion.filter_all")}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredMessages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    content={m.content}
                    author={m.author}
                    createdAt={m.createdAt}
                    attachmentPath={m.attachmentPath}
                    attachmentName={m.attachmentName}
                    attachmentMime={m.attachmentMime}
                    isOwn={m.author.id === userId}
                    reactions={m.reactions}
                    onReact={(emoji) => reactToMessage(m.id, emoji)}
                    reactOnly={!!reactOnlyChannel}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
              {canPostHere ? (
                <ChatComposer onSend={sendMessage} />
              ) : reactOnlyChannel ? (
                <p className="border-t p-4 text-center text-sm text-[#5D3A8C] bg-[#F3EEF8]/50">
                  {t("discussion.announcements_hint")}
                </p>
              ) : (
                <p className="border-t p-4 text-center text-sm text-gray-500">
                  {t("discussion.guest_read_only")}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
              <Users className="h-14 w-14 text-[#5D3A8C]/40" />
              <h3 className="mt-4 font-semibold text-gray-900">{t("discussion.network")}</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                {t("discussion.network_hint")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create community modal */}
      {showNewCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold">{t("discussion.new_community")}</h3>
            <input
              className="input-field"
              placeholder={t("discussion.community_name")}
              value={newCommName}
              onChange={(e) => setNewCommName(e.target.value)}
            />
            <input
              className="input-field"
              placeholder={t("discussion.channel_name")}
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={createCommunity} className="btn-primary flex-1">
                {t("general.create")}
              </button>
              <button
                onClick={() => setShowNewCommunity(false)}
                className="btn-secondary"
              >
                {t("general.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Meeting confirm modal */}
      {showMeetingConfirm && activeThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#F3EEF8] to-white border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5D3A8C]">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("meeting.start")}</h3>
              </div>
              <button
                onClick={() => setShowMeetingConfirm(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">{meetingLabel}</p>

              {activeThread.type === "dm" && activeThread.otherUser && (
                <div className="flex items-center gap-2 rounded-xl bg-[#F3EEF8] px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5D3A8C] text-xs text-white font-bold">
                    {(
                      activeThread.otherUser.name ||
                      activeThread.otherUser.email
                    )[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activeThread.otherUser.name || activeThread.otherUser.email}
                    </p>
                    <p className="text-xs text-gray-500">{t("meeting.invite_sent")}</p>
                  </div>
                </div>
              )}

              {activeThread.type === "channel" && (
                <div className="flex items-center gap-2 rounded-xl bg-[#F3EEF8] px-3 py-2.5">
                  <Hash className="h-4 w-4 text-[#5D3A8C]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activeThread.displayName}
                    </p>
                    <p className="text-xs text-gray-500">{t("meeting.all_invited")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={startMeetingFromChat}
                disabled={startingMeeting}
                className="btn-primary flex-1"
              >
                {startingMeeting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("meetings.creating")}
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" /> {t("meeting.start_now")}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMeetingConfirm(false)}
                className="btn-secondary"
              >
                {t("meeting.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Member modal */}
      {addMemberCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#F3EEF8] to-white border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5D3A8C]">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t("discussion.add_member")}</h3>
                  <p className="text-xs text-gray-500">{addMemberCommunity.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAddMemberCommunity(null)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                {t("discussion.invite_email")}
              </p>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field"
                  style={{ paddingLeft: '2.25rem' }}
                  type="email"
                  placeholder={t("auth.email_placeholder")}
                  value={addMemberEmail}
                  onChange={(e) => { setAddMemberEmail(e.target.value); setAddMemberResult(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMemberInvite(); }}
                  autoFocus
                />
              </div>
              {addMemberResult && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${addMemberResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {addMemberResult.msg}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={sendMemberInvite}
                disabled={addMemberLoading || !addMemberEmail.trim()}
                className="btn-primary flex-1"
              >
                {addMemberLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("settings.saving")}</> : <><UserPlus className="h-4 w-4" /> {t("discussion.send_invite")}</>}
              </button>
              <button onClick={() => setAddMemberCommunity(null)} className="btn-secondary">
                {t("general.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
