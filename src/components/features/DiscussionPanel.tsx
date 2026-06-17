"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Lock, Video, Loader2, X } from "lucide-react";
import { canPerform, type UserRole } from "@/lib/permissions";
import { PageHeader } from "./PageHeader";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";

type Message = {
  id: string;
  content: string;
  channel: string;
  createdAt: string;
  author: { name: string | null; email: string };
};

type OrgUser = { id: string; name: string | null; email: string };

export function DiscussionPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user?.role || "GUEST") as UserRole;
  const canPost = canPerform(role, "postDiscussion");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Meeting state
  const [showMeetingConfirm, setShowMeetingConfirm] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState(false);

  async function load() {
    const res = await fetch("/api/discussion");
    if (res.ok) setMessages(await res.json());
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !canPost) return;
    setLoading(true);
    await fetch("/api/discussion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, channel: "general" }),
    });
    setText("");
    setLoading(false);
    load();
  }

  async function startMeeting() {
    setStartingMeeting(true);
    try {
      // 1. Create meeting
      const meetRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "General Discussion Meeting" }),
      });
      if (!meetRes.ok) return;
      const meeting = await meetRes.json();

      // 2. Fetch all org users and invite them
      const usersRes = await fetch("/api/chat/users?q=");
      if (usersRes.ok) {
        const orgUsers: OrgUser[] = await usersRes.json();
        const participantIds = orgUsers.map((u) => u.id);
        if (participantIds.length > 0) {
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
      }

      // 3. Navigate to meeting room
      router.push(`/dashboard/meetings/room/${meeting.roomCode}`);
    } finally {
      setStartingMeeting(false);
      setShowMeetingConfirm(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Discussion"
        description="Team chat with encrypted messages"
        help="Guests can read but not post. Messages are encrypted at rest."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMeetingConfirm(true)}
              className="btn-primary text-xs py-2"
            >
              <Video className="h-3.5 w-3.5" /> Start Meeting
            </button>
            <span className="flex items-center gap-1 text-xs text-[#5D3A8C]">
              <Lock className="h-3 w-3" /> Encrypted
            </span>
          </div>
        }
      />
      <div className="card flex h-[calc(100vh-220px)] min-h-[400px] flex-col">
        <div className="border-b border-gray-100 px-4 py-2">
          <span className="rounded-lg bg-[#F3EEF8] px-3 py-1 text-sm font-medium text-[#5D3A8C]">
            # general
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5D3A8C] text-xs font-bold text-white">
                {(m.author.name || m.author.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {m.author.name || m.author.email}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {canPost ? (
          <form onSubmit={send} className="border-t border-gray-100 p-4 flex gap-2 items-center">
            <EmojiPicker
              onInsert={(emoji) =>
                setText((t) => insertEmojiAtCursor(t, emoji, inputRef.current))
              }
            />
            <input
              ref={inputRef}
              className="input-field flex-1"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <p className="border-t border-gray-100 p-4 text-center text-sm text-gray-500">
            Guest accounts can view discussions but cannot post.
          </p>
        )}
      </div>

      {/* Start Meeting confirm modal */}
      {showMeetingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#F3EEF8] to-white border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5D3A8C]">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Start Meeting</h3>
              </div>
              <button
                onClick={() => setShowMeetingConfirm(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Start a video meeting for the general discussion channel. All organization
                members will receive an invite via direct message.
              </p>
              <div className="rounded-xl bg-[#F3EEF8] px-3 py-2.5 text-sm text-[#5D3A8C]">
                📹 <strong>General Discussion Meeting</strong>
                <p className="mt-0.5 text-xs text-gray-500">Invites sent to all members via DM</p>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={startMeeting}
                disabled={startingMeeting}
                className="btn-primary flex-1"
              >
                {startingMeeting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" /> Start now
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMeetingConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
