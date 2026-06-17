"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Phone, PhoneOff, Video, PhoneCall, Copy, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/translations";
import type { CallInvitation, CallType } from "@/lib/call-store";
import { startCallRing, type RingKind } from "@/lib/call-ringtone";

type CallContextValue = {
  ringUser: (
    targetId: string,
    type: CallType,
    title?: string
  ) => Promise<{ call?: CallInvitation; roomCode?: string; meetingLink?: string } | null>;
  ringMeeting: (opts: {
    participantIds: string[];
    roomCode: string;
    meetingLink: string;
    title: string;
  }) => Promise<{ call?: CallInvitation } | null>;
  incoming: CallInvitation | null;
  outgoing: CallInvitation | null;
  clearOutgoing: () => void;
};

const CallContext = createContext<CallContextValue>({
  ringUser: async () => null,
  ringMeeting: async () => null,
  incoming: null,
  outgoing: null,
  clearOutgoing: () => {},
});

export function useCall() {
  return useContext(CallContext);
}

function ringKind(type: CallType): RingKind {
  return type === "meet" ? "meet" : "audio";
}

function roomPath(code: string, type: CallType) {
  const mode = type === "audio" ? "?mode=phone" : "";
  return `/dashboard/meetings/room/${code}${mode}`;
}

function OutgoingCallOverlay({
  outgoing,
  onCancel,
  onCopyLink,
  copied,
  t,
}: {
  outgoing: CallInvitation;
  onCancel: () => void;
  onCopyLink: () => void;
  copied: boolean;
  t: (key: TranslationKey) => string;
}) {
  useEffect(() => {
    const stop = startCallRing(ringKind(outgoing.type));
    return stop;
  }, [outgoing.type]);

  const isMeet = outgoing.type === "meet";
  const isGroup = (outgoing.participantCount ?? 0) > 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: isMeet
            ? "linear-gradient(135deg,#1a0a2e 0%,#2d1454 60%,#5D3A8C 100%)"
            : "linear-gradient(135deg,#052e16 0%,#14532d 60%,#166534 100%)",
        }}
      >
        <div className="relative flex flex-col items-center pt-10 pb-6 px-6">
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {isMeet ? (
                <Video className="h-9 w-9 text-white" />
              ) : (
                <Phone className="h-9 w-9 text-white" />
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-white/70 uppercase tracking-widest mb-1">
            {t("meeting.calling")}
          </p>
          <h3 className="text-xl font-bold text-white mb-1 text-center">{outgoing.title}</h3>
          <p className="text-sm text-white/60 flex items-center gap-1.5">
            {isMeet ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
            {isMeet ? t("discussion.meet") : t("meeting.audio_call")}
            {isGroup && (
              <span className="ml-1 text-white/40">
                · {outgoing.participantCount} {t("room.participants").toLowerCase()}
              </span>
            )}
          </p>
          <p className="mt-3 text-xs text-white/50 text-center max-w-[220px]">
            {t("call.waiting_in_room")}
          </p>
          <button
            onClick={onCopyLink}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs text-white hover:bg-white/25 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("call.link_copied") : t("meeting.copy_link")}
          </button>
          <button
            onClick={onCancel}
            className="mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
          <p className="mt-2 text-xs text-white/50">{t("meeting.cancel")}</p>
        </div>
      </div>
    </div>
  );
}

function IncomingCallOverlay({
  call,
  onAccept,
  onDecline,
  t,
}: {
  call: CallInvitation;
  onAccept: () => void;
  onDecline: () => void;
  t: (key: TranslationKey) => string;
}) {
  useEffect(() => {
    const stop = startCallRing(ringKind(call.type));
    return stop;
  }, [call.type]);

  const isMeet = call.type === "meet";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: isMeet
            ? "linear-gradient(135deg,#1a0a2e 0%,#2d1454 60%,#5D3A8C 100%)"
            : "linear-gradient(135deg,#052e16 0%,#14532d 60%,#166534 100%)",
        }}
      >
        <div className="relative flex flex-col items-center pt-10 pb-8 px-6">
          <div
            className={`mb-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
              isMeet ? "bg-purple-500/30 text-purple-200" : "bg-green-500/30 text-green-200"
            }`}
          >
            {isMeet
              ? `📹 ${t("meeting.incoming")} — ${t("discussion.meet")}`
              : `📞 ${t("meeting.incoming")} — ${t("meeting.audio_call")}`}
          </div>
          <div className="relative mb-6">
            <span className="absolute inset-[-16px] rounded-full border-2 animate-ping border-purple-400/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-2 ring-white/20">
              <span className="text-3xl font-bold text-white">
                {call.callerName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-0.5">{call.callerName}</h3>
          <p className="text-sm text-white/50 mb-8 text-center">{call.title}</p>
          <div className="flex gap-10">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onDecline}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </button>
              <span className="text-xs text-white/50">{t("meeting.decline")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                  isMeet ? "bg-purple-500 hover:bg-purple-600" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isMeet ? (
                  <Video className="h-6 w-6 text-white relative z-10" />
                ) : (
                  <Phone className="h-6 w-6 text-white relative z-10" />
                )}
              </button>
              <span className="text-xs text-white/50">{t("meeting.accept")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallToast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3 shadow-xl text-white text-sm">
      <PhoneCall className="h-4 w-4 text-red-400" />
      {msg}
    </div>
  );
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [incoming, setIncoming] = useState<CallInvitation | null>(null);
  const [outgoing, setOutgoing] = useState<CallInvitation | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const prevStatus = useRef<string | null>(null);

  const clearOutgoing = useCallback(() => {
    setOutgoing(null);
    prevStatus.current = null;
  }, []);

  const dismissIncoming = useCallback(async () => {
    try {
      await fetch("/api/calls", { method: "PUT" });
    } catch {
      /* skip */
    }
    setIncoming(null);
  }, []);

  useEffect(() => {
    if (pathname?.includes("/dashboard/meetings/room/")) {
      dismissIncoming();
    }
  }, [pathname, dismissIncoming]);

  const poll = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/calls");
      if (!res.ok) return;
      const data = await res.json();
      setIncoming(data.incoming ?? null);

      const og: CallInvitation | null = data.outgoing ?? null;
      if (og?.status === "accepted") {
        clearOutgoing();
        if (!pathname?.includes("/dashboard/meetings/room/")) {
          router.push(roomPath(og.roomCode, og.type));
        }
        return;
      }
      if (og && prevStatus.current === "ringing" && og.status === "declined") {
        setToast(t("call.declined"));
        clearOutgoing();
        return;
      }
      if (!og && prevStatus.current === "ringing") {
        clearOutgoing();
        return;
      }
      if (og) {
        setOutgoing(og);
        prevStatus.current = og.status ?? null;
      }
    } catch {
      /* skip */
    }
  }, [session?.user?.id, pathname, router, t, clearOutgoing]);

  useEffect(() => {
    if (!session?.user?.id) return;
    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [poll, session?.user?.id]);

  const ringUser = useCallback(
    async (targetId: string, type: CallType, title?: string) => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, type, title }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.call) {
        setOutgoing(data.call);
        prevStatus.current = "ringing";
      }
      if (data.roomCode) {
        router.push(roomPath(data.roomCode, type));
      }
      return data;
    },
    [router]
  );

  const ringMeeting = useCallback(
    async (opts: {
      participantIds: string[];
      roomCode: string;
      meetingLink: string;
      title: string;
    }) => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: opts.participantIds,
          roomCode: opts.roomCode,
          meetingLink: opts.meetingLink,
          title: opts.title,
          type: "meet",
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.call) {
        setOutgoing(data.call);
        prevStatus.current = "ringing";
      }
      router.push(roomPath(opts.roomCode, "meet"));
      return data;
    },
    [router]
  );

  async function acceptCall() {
    if (!incoming) return;
    await fetch("/api/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: incoming.id, status: "accepted" }),
    });
    const path = roomPath(incoming.roomCode, incoming.type);
    await dismissIncoming();
    router.push(path);
  }

  async function declineCall() {
    if (!incoming) return;
    await fetch("/api/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: incoming.id, status: "declined" }),
    });
    await dismissIncoming();
  }

  async function cancelOutgoing() {
    await fetch("/api/calls", { method: "DELETE" });
    await fetch("/api/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_outgoing" }),
    });
    clearOutgoing();
  }

  async function copyMeetingLink() {
    if (!outgoing?.meetingLink) return;
    try {
      await navigator.clipboard.writeText(outgoing.meetingLink);
    } catch {
      /* skip */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inRoom = pathname?.includes("/dashboard/meetings/room/");
  const showOutgoingOverlay = outgoing?.status === "ringing" && !inRoom;

  return (
    <CallContext.Provider
      value={{ ringUser, ringMeeting, incoming, outgoing, clearOutgoing }}
    >
      {children}
      {incoming && !inRoom && (
        <IncomingCallOverlay
          call={incoming}
          onAccept={acceptCall}
          onDecline={declineCall}
          t={t}
        />
      )}
      {showOutgoingOverlay && (
        <OutgoingCallOverlay
          outgoing={outgoing!}
          onCancel={cancelOutgoing}
          onCopyLink={copyMeetingLink}
          copied={copied}
          t={t}
        />
      )}
      {toast && <CallToast msg={toast} onClose={() => setToast(null)} />}
    </CallContext.Provider>
  );
}
