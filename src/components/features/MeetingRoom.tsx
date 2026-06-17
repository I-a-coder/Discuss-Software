"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Hand,
  Monitor,
  MonitorOff,
  Circle,
  Square,
  Smile,
  Copy,
  MessageSquare,
  Users,
  ArrowLeft,
  LayoutGrid,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Paperclip,
  Image as ImageIcon,
  UserPlus,
  Settings,
  UserMinus,
} from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { startCallRing } from "@/lib/call-ringtone";
import { RING_WAIT_MS } from "@/lib/call-store";
import { useMeetingWebRTC } from "@/hooks/useMeetingWebRTC";
import {
  useVirtualBackground,
  type BackgroundEffect,
  getRecorderMimeType,
  buildRecordingStream,
} from "@/hooks/useVirtualBackground";
import { StickyNote, PenTool } from "lucide-react";
import dynamic from "next/dynamic";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";
import { Toast } from "@/components/ui/Toast";
import { SaveNoteModal } from "@/components/ui/SaveNoteModal";
import { playSaveSound } from "@/lib/save-sound";
import { useLanguage } from "@/contexts/LanguageContext";

function WhiteboardLoading() {
  const { t } = useLanguage();
  return <p className="p-4 text-sm text-gray-500">{t("room.loading_whiteboard")}</p>;
}

const WhiteboardCanvas = dynamic(
  () =>
    import("@/components/features/WhiteboardCanvas").then((m) => ({
      default: m.WhiteboardCanvas,
    })),
  { ssr: false, loading: () => <WhiteboardLoading /> }
);

const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉"];

type Participant = {
  userId: string;
  name: string;
  handRaised: boolean;
  videoOn: boolean;
  audioOn: boolean;
  screenSharing: boolean;
  reactions: { emoji: string; at: number }[];
  isHost?: boolean;
  isCoHost?: boolean;
  micLocked?: boolean;
  cameraLocked?: boolean;
};

type HostAction =
  | "mute"
  | "mic_lock"
  | "mic_allow"
  | "video_off"
  | "video_lock"
  | "video_allow"
  | "make_cohost"
  | "remove_cohost"
  | "kick"
  | "mute_all"
  | "mic_lock_all"
  | "mic_allow_all"
  | "video_off_all"
  | "video_lock_all"
  | "video_allow_all";

type OrgUser = { id: string; name: string | null; email: string };

type ReactionAnim = { id: string; emoji: string; x: number };

export function MeetingRoom({
  roomCode,
  title,
  audioOnly = false,
}: {
  roomCode: string;
  title: string;
  audioOnly?: boolean;
}) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { outgoing, clearOutgoing } = useCall();
  const userId = session?.user?.id || "";
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [phoneMode, setPhoneMode] = useState(audioOnly);
  const [hostId, setHostId] = useState<string | null>(null);
  const [coHostIds, setCoHostIds] = useState<Set<string>>(new Set());
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSelected, setInviteSelected] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [hostTargetId, setHostTargetId] = useState<string>("__all__");
  const [ringCountdown, setRingCountdown] = useState(RING_WAIT_MS / 1000);
  const waitStartRef = useRef<number | null>(null);
  const hostSettingsRef = useRef<HTMLDivElement>(null);
  const [micLocked, setMicLocked] = useState(false);
  const [cameraLocked, setCameraLocked] = useState(false);
  const [isAudioOnlyMeeting, setIsAudioOnlyMeeting] = useState(audioOnly);
  const cameraPermanentlyOff = isAudioOnlyMeeting || audioOnly;
  const [handRaised, setHandRaised] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micDetected, setMicDetected] = useState<boolean | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chat, setChat] = useState("");
  const [chatLines, setChatLines] = useState<
    {
      name: string;
      text: string;
      at: number;
      attachmentPath?: string;
      attachmentName?: string;
    }[]
  >([]);
  const [reactionAnims, setReactionAnims] = useState<ReactionAnim[]>([]);
  const seenReactionsRef = useRef<Set<string>>(new Set());
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "chat" | "people" | "whiteboard">("none");
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [backgroundEffect, setBackgroundEffect] =
    useState<BackgroundEffect>("none");
  const [customBackgroundSrc, setCustomBackgroundSrc] = useState<string | null>(
    null
  );
  const [elapsed, setElapsed] = useState(0);
  const timerBaseRef = useRef<{ startedAt: number; serverOffset: number } | null>(null);
  const [meetingChatUploading, setMeetingChatUploading] = useState(false);
  const [showQuickNotes, setShowQuickNotes] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [savedNoteModal, setSavedNoteModal] = useState<string | null>(null);
  const quickNoteRef = useRef<HTMLTextAreaElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);
  const customBackgroundInputRef = useRef<HTMLInputElement>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const { displayStream } = useVirtualBackground(
    localStream,
    backgroundEffect,
    videoOn && !phoneMode && !screenSharing,
    customBackgroundSrc
  );
  const { connectToPeer, replaceTracks, cleanup, setOnRemoteStream } =
    useMeetingWebRTC(roomCode, userId, displayStream || localStream);

  const syncPresence = useCallback(
    async (extra?: Record<string, unknown>) => {
      const effectiveVideo = cameraPermanentlyOff ? false : videoOn;
      const effectiveAudio = micLocked && audioOn ? false : audioOn;
      await fetch(`/api/meetings/${roomCode}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoOn: effectiveVideo,
          audioOn: effectiveAudio,
          handRaised,
          screenSharing,
          ...extra,
        }),
      });
    },
    [roomCode, videoOn, audioOn, handRaised, screenSharing, cameraPermanentlyOff, micLocked]
  );

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !cameraPermanentlyOff && !phoneMode,
        audio: true,
      });
      localStreamRef.current = stream;
      cameraStreamRef.current = stream;
      setLocalStream(stream);
    } catch {
      setError(t("room.camera_denied"));
    }
  }, [cameraPermanentlyOff, phoneMode]);

  useEffect(() => {
    startMedia();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      cleanup();
    };
  }, [startMedia, cleanup]);

  // Mic level meter via Web Audio API
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (!localStream) { setMicLevel(0); return; }
    const audioTracks = localStream.getAudioTracks();
    setMicDetected(audioTracks.length > 0);
    if (!audioTracks.length || !audioOn) { setMicLevel(0); return; }
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setMicLevel(Math.min(100, avg * 2.5));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(animFrameRef.current!);
        source.disconnect();
        ctx.close();
      };
    } catch {
      setMicLevel(0);
    }
  }, [localStream, audioOn]);

  useEffect(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !cameraPermanentlyOff && !phoneMode && videoOn && !cameraLocked;
    });
    stream.getAudioTracks().forEach((t) => {
      t.enabled = audioOn;
    });
  }, [videoOn, audioOn, phoneMode, cameraPermanentlyOff, cameraLocked]);

  useEffect(() => {
    const out = displayStream || localStream;
    if (localVideoRef.current && out && videoOn && !phoneMode && !screenSharing) {
      localVideoRef.current.srcObject = out;
    }
    if (out) replaceTracks(out);
  }, [displayStream, localStream, videoOn, phoneMode, screenSharing, replaceTracks]);

  useEffect(() => {
    fetch(`/api/meetings/${roomCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.meeting?.meetingLink) setMeetingLink(d.meeting.meetingLink);
        if (d.meeting?.id) setMeetingId(d.meeting.id);
        if (d.meeting?.hostId) setHostId(d.meeting.hostId);
      });
  }, [roomCode]);

  useEffect(() => {
    const tick = () => {
      const base = timerBaseRef.current;
      if (!base) {
        setElapsed(0);
        return;
      }
      const now = Date.now() + base.serverOffset;
      setElapsed(Math.max(0, Math.floor((now - base.startedAt) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const timerStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  useEffect(() => {
    setOnRemoteStream((peerId, stream) => {
      const el = remoteVideosRef.current.get(peerId);
      if (el) el.srcObject = stream;
    });
  }, [setOnRemoteStream]);

  useEffect(() => {
    return () => {
      if (customBackgroundSrc) URL.revokeObjectURL(customBackgroundSrc);
    };
  }, [customBackgroundSrc]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        showCameraMenu &&
        cameraMenuRef.current &&
        !cameraMenuRef.current.contains(e.target as Node)
      ) {
        setShowCameraMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showCameraMenu]);

  const applyHostCommand = useCallback(
    async (action: string, commandId: string) => {
      if (action === "mute" || action === "mic_lock") {
        setAudioOn(false);
        localStreamRef.current?.getAudioTracks().forEach((tr) => {
          tr.enabled = false;
        });
        await syncPresence({ audioOn: false });
        if (action === "mic_lock") setMicLocked(true);
      } else if (action === "mic_allow") {
        setMicLocked(false);
      } else if (action === "video_off" || action === "video_lock") {
        setVideoOn(false);
        localStreamRef.current?.getVideoTracks().forEach((tr) => {
          tr.enabled = false;
        });
        await syncPresence({ videoOn: false });
        if (action === "video_lock") setCameraLocked(true);
      } else if (action === "video_allow") {
        setCameraLocked(false);
      } else if (action === "make_cohost") {
        setCoHostIds((prev) => new Set([...prev, userId]));
      } else if (action === "remove_cohost") {
        setCoHostIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else if (action === "kicked") {
        localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
        window.location.href = "/dashboard/meetings?removed=1";
        return;
      }
      await fetch(`/api/meetings/${roomCode}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ackCommand: commandId }),
      });
    },
    [roomCode, userId, syncPresence]
  );

  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/meetings/${roomCode}/presence`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.meetingEnded) {
        localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
        // Redirect to review page — use meetingId if available, otherwise fall back
        window.location.href = meetingId
          ? `/dashboard/meetings/review?meetingId=${meetingId}`
          : "/dashboard/meetings?ended=1";
        return;
      }

      setParticipants(data.participants || []);
      setChatLines(data.chat || []);
      if (data.participantCount >= 2 && data.startedAt && data.serverNow) {
        const serverNow = new Date(data.serverNow as string).getTime();
        const startedAt = new Date(data.startedAt as string).getTime();
        timerBaseRef.current = {
          startedAt,
          serverOffset: serverNow - Date.now(),
        };
      } else {
        timerBaseRef.current = null;
      }
      if (data.hostId) setHostId(data.hostId);
      if (data.coHostIds) setCoHostIds(new Set(data.coHostIds as string[]));
      if (data.audioOnly) {
        setIsAudioOnlyMeeting(true);
        setPhoneMode(true);
        setVideoOn(false);
      }
      if (data.myPermissions) {
        setMicLocked(!!data.myPermissions.micLocked);
        setCameraLocked(!!data.myPermissions.cameraLocked);
      }

      const pending = (data.pendingCommands || []) as { id: string; action: string }[];
      for (const cmd of pending) {
        await applyHostCommand(cmd.action, cmd.id);
      }

      const reactions = (data.reactions || []) as {
        userId: string;
        emoji: string;
        at: number;
      }[];
      reactions.forEach((r) => {
        const key = `${r.userId}-${r.at}-${r.emoji}`;
        if (seenReactionsRef.current.has(key)) return;
        seenReactionsRef.current.add(key);
        const x = 15 + (parseInt(r.userId.slice(-6), 16) % 70);
        setReactionAnims((prev) => [...prev, { id: key, emoji: r.emoji, x }]);
        setTimeout(() => {
          setReactionAnims((prev) => prev.filter((a) => a.id !== key));
        }, 2400);
      });
      (data.participants as Participant[]).forEach((p) => {
        if (p.userId !== userId) connectToPeer(p.userId);
      });
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [roomCode, userId, connectToPeer, applyHostCommand]);

  useEffect(() => {
    syncPresence();
    const id = setInterval(() => syncPresence(), 3000);
    return () => clearInterval(id);
  }, [syncPresence]);

  const isWaitingAlone =
    participants.length < 2 &&
    outgoing?.status === "ringing" &&
    (userId === hostId || hostId === null);

  useEffect(() => {
    if (!isWaitingAlone) {
      waitStartRef.current = null;
      return;
    }
    if (!waitStartRef.current) waitStartRef.current = Date.now();
    const stopRing = startCallRing(
      isAudioOnlyMeeting || cameraPermanentlyOff ? "audio" : "meet"
    );
    const tick = setInterval(() => {
      const elapsed = Date.now() - (waitStartRef.current || Date.now());
      setRingCountdown(Math.max(0, Math.ceil((RING_WAIT_MS - elapsed) / 1000)));
    }, 500);
    const timeout = setTimeout(async () => {
      if (participants.length >= 2) return;
      try {
        await fetch("/api/calls", { method: "DELETE" });
        await fetch(`/api/meetings/${roomCode}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end" }),
        });
      } catch {
        /* skip */
      }
      clearOutgoing();
      localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      window.location.href = "/dashboard/meetings?noanswer=1";
    }, RING_WAIT_MS);
    return () => {
      stopRing();
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [
    isWaitingAlone,
    isAudioOnlyMeeting,
    cameraPermanentlyOff,
    participants.length,
    roomCode,
    clearOutgoing,
    userId,
    hostId,
    outgoing?.status,
  ]);

  useEffect(() => {
    if (participants.length >= 2 && outgoing?.status === "ringing") {
      clearOutgoing();
    }
  }, [participants.length, outgoing?.status, clearOutgoing]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        showHostSettings &&
        hostSettingsRef.current &&
        !hostSettingsRef.current.contains(e.target as Node)
      ) {
        setShowHostSettings(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showHostSettings]);

  useEffect(() => {
    if (!showInvite) return;
    fetch("/api/chat/users?q=")
      .then((r) => r.json())
      .then((users: OrgUser[]) => {
        const inRoom = new Set(participants.map((p) => p.userId));
        setOrgUsers(users.filter((u) => u.id !== userId && !inRoom.has(u.id)));
      })
      .catch(() => {});
  }, [showInvite, participants, userId]);

  const isHostOrCoHost =
    userId === hostId || coHostIds.has(userId);

  async function hostAction(action: HostAction, targetUserId?: string) {
    const body: Record<string, string> = { action };
    if (targetUserId) body.targetUserId = targetUserId;
    await fetch(`/api/meetings/${roomCode}/host`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (action === "kick") {
      setToast({ msg: t("room.remove_from_meeting"), type: "success" });
    }
  }

  function runHostControl(
    action: HostAction,
    memberAction?: HostAction
  ) {
    if (hostTargetId === "__all__") {
      void hostAction(action);
    } else if (memberAction) {
      void hostAction(memberAction, hostTargetId);
    }
    setShowHostSettings(false);
  }

  const controllableMembers = participants.filter(
    (p) => p.userId !== userId && !p.isHost
  );

  async function inviteMembers() {
    const ids = [...inviteSelected];
    if (!ids.length) return;
    setInviting(true);
    try {
      await fetch(`/api/meetings/${roomCode}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", participantIds: ids }),
      });
      setInviteSelected(new Set());
      setShowInvite(false);
      setToast({ msg: t("room.invite_sent"), type: "success" });
    } finally {
      setInviting(false);
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        setLocalStream(localStreamRef.current);
      }
      await syncPresence({ screenSharing: false });
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = display;
      setScreenSharing(true);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = display;
      setLocalStream(display);
      replaceTracks(display);
      display.getVideoTracks()[0].onended = () => {
        toggleScreenShare();
      };
      await syncPresence({ screenSharing: true });
    } catch {
      setError(t("room.screen_cancelled"));
    }
  }

  function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const videoSrc =
      screenStreamRef.current ||
      (videoOn && !phoneMode ? displayStream || localStreamRef.current : null);
    const stream = buildRecordingStream(videoSrc, localStreamRef.current);
    if (!stream || stream.getTracks().length === 0) {
      setError(t("room.mic_required"));
      return;
    }
    recordChunksRef.current = [];
    const mimeType = getRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      setError(t("room.recording_unsupported"));
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size) recordChunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      setError(t("room.recording_failed"));
      setRecording(false);
    };
    recorder.onstop = async () => {
      if (recordChunksRef.current.length === 0) {
        setError(t("room.no_recording_data"));
        return;
      }
      const blob = new Blob(recordChunksRef.current, {
        type: mimeType || "video/webm",
      });
      await fetch(`/api/meetings/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recording",
          size: blob.size,
          duration: Math.round(blob.size / 800),
          transcriptSnippet: `[Recording] ${(blob.size / 1024 / 1024).toFixed(2)} MB saved.`,
        }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yusi-meeting-${roomCode}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    setError(null);
    syncPresence();
  }

  function playReactionAnim(emoji: string) {
    const key = `${userId}-${Date.now()}-${emoji}`;
    const x = 20 + Math.random() * 60;
    setReactionAnims((prev) => [...prev, { id: key, emoji, x }]);
    setTimeout(() => {
      setReactionAnims((prev) => prev.filter((a) => a.id !== key));
    }, 2400);
  }

  async function sendReaction(emoji: string) {
    await syncPresence({ reaction: emoji });
    playReactionAnim(emoji);
  }

  function onCustomBackgroundSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ msg: t("room.upload_image_only"), type: "error" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCustomBackgroundSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBackgroundEffect("bg-custom");
    setShowCameraMenu(false);
  }

  async function saveQuickNote() {
    if (!quickNote.trim() && !quickNoteTitle.trim()) return;
    const noteTitle = quickNoteTitle.trim() || `Meeting ${roomCode}`;
    const res = await fetch("/api/notes/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle,
        content: quickNote,
      }),
    });
    if (res.ok) {
      playSaveSound();
      setSavedNoteModal(noteTitle);
      setQuickNote("");
      setQuickNoteTitle("");
    } else {
      setToast({ msg: t("room.could_not_save_note"), type: "error" });
    }
  }

  function presentWhiteboardStream(stream: MediaStream) {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      if (t.enabled) stream.addTrack(t.clone());
    });
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    screenStreamRef.current = stream;
    setScreenSharing(true);
    setLocalStream(stream);
    replaceTracks(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    syncPresence({ screenSharing: true });
    setPanel("none");
  }

  async function leaveMeeting() {
    const res = await fetch(`/api/meetings/${roomCode}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leave: true }),
    });
    await res.json().catch(() => null);
    localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    // Use cached meetingId, or fetch fresh if the state is still empty (race condition)
    let id = meetingId;
    if (!id) {
      try {
        const r = await fetch(`/api/meetings/${roomCode}`);
        const d = await r.json();
        id = d.meeting?.id || "";
      } catch { /* ignore */ }
    }
    window.location.href = id
      ? `/dashboard/meetings/review?meetingId=${id}`
      : "/dashboard/meetings?ended=1";
  }

  function toggleMic() {
    if (!audioOn && micLocked) {
      setToast({ msg: t("room.mic_locked"), type: "error" });
      return;
    }
    setAudioOn((a) => !a);
  }

  function toggleCamera() {
    if (cameraPermanentlyOff) return;
    if (!videoOn && cameraLocked) {
      setToast({ msg: t("room.camera_locked"), type: "error" });
      return;
    }
    setPhoneMode(false);
    setVideoOn((v) => !v);
  }

  async function sendMeetingChat(extra?: {
    attachmentPath?: string;
    attachmentName?: string;
    attachmentMime?: string;
  }) {
    if (!chat.trim() && !extra?.attachmentPath) return;
    await syncPresence({ chat, ...extra });
    setChat("");
  }

  async function uploadMeetingAttachment(file: File) {
    setMeetingChatUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setMeetingChatUploading(false);
    if (res.ok) {
      const data = await res.json();
      await sendMeetingChat({
        attachmentPath: data.path,
        attachmentName: data.name,
        attachmentMime: data.mime,
      });
    }
  }

  async function copyLink() {
    const link =
      meetingLink || `${window.location.origin}/dashboard/meetings/room/${roomCode}`;
    await navigator.clipboard.writeText(link);
  }

  const remoteParticipants = participants.filter((p) => p.userId !== userId);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col -m-2 md:-m-4 bg-[#201f1e] rounded-2xl overflow-hidden relative">
      {savedNoteModal && (
        <SaveNoteModal
          title={savedNoteModal}
          onClose={() => setSavedNoteModal(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {isWaitingAlone && (
        <div className="shrink-0 flex items-center justify-between gap-3 bg-[#5D3A8C] px-4 py-2 text-white text-sm z-30">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {t("room.ringing_participants")} — {t("room.waiting_seconds")} ({ringCountdown}s)
          </span>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/calls", { method: "DELETE" });
              clearOutgoing();
              await leaveMeeting();
            }}
            className="rounded-lg bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
          >
            {t("meeting.cancel")}
          </button>
        </div>
      )}
      {/* Teams-style top control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border-b border-gray-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={leaveMeeting}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            title={t("room.leave")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" /> {timerStr} · {roomCode}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          {isHostOrCoHost && (
            <div className="relative" ref={hostSettingsRef}>
              <TeamsBarBtn
                label={t("room.host_settings")}
                active={showHostSettings}
                onClick={() => setShowHostSettings((s) => !s)}
              >
                <Settings className="h-4 w-4" />
              </TeamsBarBtn>
              {showHostSettings && (
                <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-white border border-gray-100 shadow-2xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#F3EEF8] to-white border-b border-gray-100">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5D3A8C]">
                      <Settings className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t("room.host_settings")}</p>
                      <p className="text-[11px] text-gray-500">{t("room.select_member")}</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {/* Member selector */}
                    <select
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5D3A8C]/30 transition"
                      value={hostTargetId}
                      onChange={(e) => setHostTargetId(e.target.value)}
                    >
                      <option value="__all__">{t("room.target_all")}</option>
                      {controllableMembers.map((p) => (
                        <option key={p.userId} value={p.userId}>{p.name}</option>
                      ))}
                    </select>

                    {/* Mic controls */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50/80 border-b border-gray-100">
                        <Mic className="h-3 w-3" /> {t("room.mic_controls")}
                      </p>
                      <div className="grid grid-cols-3 divide-x divide-gray-100">
                        <button type="button"
                          className="py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition"
                          onClick={() => runHostControl("mute_all", "mute")}>
                          {t("room.mute_all")}
                        </button>
                        <button type="button"
                          className="py-2 text-[11px] font-medium text-red-600 hover:bg-red-50 transition"
                          onClick={() => runHostControl("mic_lock_all", "mic_lock")}>
                          🔒 {t("room.lock_all_mics")}
                        </button>
                        <button type="button"
                          className="py-2 text-[11px] font-medium text-green-600 hover:bg-green-50 transition"
                          onClick={() => runHostControl("mic_allow_all", "mic_allow")}>
                          ✓ {t("room.allow_all_mics")}
                        </button>
                      </div>
                    </div>

                    {/* Camera controls */}
                    {!cameraPermanentlyOff && (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50/80 border-b border-gray-100">
                          <Video className="h-3 w-3" /> {t("room.camera_controls")}
                        </p>
                        <div className="grid grid-cols-3 divide-x divide-gray-100">
                          <button type="button"
                            className="py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition"
                            onClick={() => runHostControl("video_off_all", "video_off")}>
                            {t("room.camera_off_all")}
                          </button>
                          <button type="button"
                            className="py-2 text-[11px] font-medium text-red-600 hover:bg-red-50 transition"
                            onClick={() => runHostControl("video_lock_all", "video_lock")}>
                            🔒 {t("room.lock_all_cameras")}
                          </button>
                          <button type="button"
                            className="py-2 text-[11px] font-medium text-green-600 hover:bg-green-50 transition"
                            onClick={() => runHostControl("video_allow_all", "video_allow")}>
                            ✓ {t("room.allow_all_cameras")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Per-participant controls */}
                    {hostTargetId !== "__all__" && (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50/80 border-b border-gray-100">
                          <Users className="h-3 w-3" /> {t("room.participant_controls")}
                        </p>
                        <div className="p-2 flex flex-wrap gap-1.5">
                          <button type="button"
                            className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200 transition"
                            onClick={() => { void hostAction("mute", hostTargetId); setShowHostSettings(false); }}>
                            {t("room.mute")}
                          </button>
                          <button type="button"
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 transition"
                            onClick={() => { void hostAction("mic_lock", hostTargetId); setShowHostSettings(false); }}>
                            🔒 {t("room.lock_mic")}
                          </button>
                          <button type="button"
                            className="rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-medium text-green-700 hover:bg-green-100 transition"
                            onClick={() => { void hostAction("mic_allow", hostTargetId); setShowHostSettings(false); }}>
                            ✓ {t("room.allow_mic")}
                          </button>
                          {!cameraPermanentlyOff && (
                            <>
                              <button type="button"
                                className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200 transition"
                                onClick={() => { void hostAction("video_off", hostTargetId); setShowHostSettings(false); }}>
                                {t("room.camera_off")}
                              </button>
                              <button type="button"
                                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 transition"
                                onClick={() => { void hostAction("video_lock", hostTargetId); setShowHostSettings(false); }}>
                                🔒 {t("room.lock_camera")}
                              </button>
                              <button type="button"
                                className="rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-medium text-green-700 hover:bg-green-100 transition"
                                onClick={() => { void hostAction("video_allow", hostTargetId); setShowHostSettings(false); }}>
                                ✓ {t("room.allow_camera")}
                              </button>
                            </>
                          )}
                          <button type="button"
                            className="rounded-lg bg-[#F3EEF8] px-2.5 py-1.5 text-[11px] font-medium text-[#5D3A8C] hover:bg-[#e8e0f5] transition flex items-center gap-1"
                            onClick={() => { void hostAction("make_cohost", hostTargetId); setShowHostSettings(false); }}>
                            <UserPlus className="h-3 w-3" /> {t("room.make_cohost")}
                          </button>
                          <button type="button"
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-red-700 transition flex items-center gap-1 ml-auto"
                            onClick={() => { void hostAction("kick", hostTargetId); setShowHostSettings(false); }}>
                            <UserMinus className="h-3 w-3" /> {t("room.remove_from_meeting")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <TeamsBarBtn label={t("room.record")} active={recording} onClick={toggleRecording}>
            <Circle className={`h-4 w-4 ${recording ? "fill-red-500 text-red-500" : ""}`} />
          </TeamsBarBtn>
          <TeamsBarBtn label={t("room.chat")} active={panel === "chat"} onClick={() => setPanel(panel === "chat" ? "none" : "chat")}>
            <MessageSquare className="h-4 w-4" />
          </TeamsBarBtn>
          <TeamsBarBtn label={t("room.people")} active={panel === "people"} onClick={() => setPanel(panel === "people" ? "none" : "people")}>
            <Users className="h-4 w-4" />
          </TeamsBarBtn>
          <TeamsBarBtn label={t("room.raise")} active={handRaised} onClick={() => { setHandRaised((h) => !h); syncPresence({ handRaised: !handRaised }); }}>
            <Hand className="h-4 w-4" />
          </TeamsBarBtn>
          <div className="relative" ref={reactionsRef}>
            <TeamsBarBtn
              label={t("room.react")}
              active={showReactions}
              onClick={() => setShowReactions((s) => !s)}
            >
              <Smile className="h-4 w-4" />
            </TeamsBarBtn>
            <div
              className={`absolute top-full left-0 mt-1 gap-1 rounded-xl bg-white border shadow-lg p-2 z-20 ${
                showReactions ? "flex" : "hidden"
              }`}
            >
              {REACTIONS.map((e) => (
                <button key={e} type="button" className="text-xl hover:scale-125" onClick={() => sendReaction(e)}>{e}</button>
              ))}
            </div>
          </div>
          <TeamsBarBtn label={t("room.view")} active={viewMode === "speaker"} onClick={() => setViewMode((v) => (v === "grid" ? "speaker" : "grid"))}>
            <LayoutGrid className="h-4 w-4" />
          </TeamsBarBtn>
          <TeamsBarBtn label={t("room.more")} active={false} onClick={copyLink}>
            <MoreHorizontal className="h-4 w-4" />
          </TeamsBarBtn>
          <span className="w-px h-8 bg-gray-200 mx-1" />
          {!cameraPermanentlyOff && (
          <TeamsBarBtn
            label={videoOn ? t("room.camera") : t("room.camera_off")}
            active={videoOn}
            onClick={toggleCamera}
          >
            {videoOn ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4" />
            )}
          </TeamsBarBtn>
          )}
          {!cameraPermanentlyOff && (
          <div className="relative" ref={cameraMenuRef}>
            <button
              type="button"
              title={t("room.effects_title")}
              onClick={() => setShowCameraMenu((s) => !s)}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-gray-600 hover:bg-gray-100 min-w-[40px]"
            >
              <ChevronDown className="h-4 w-4" />
              <span className="text-[10px] font-medium">{t("room.effects")}</span>
            </button>
            {showCameraMenu && (
              <div className="absolute top-full right-0 mt-1 w-52 rounded-xl bg-white border shadow-xl p-2 z-30 text-xs space-y-1">
                <p className="font-medium text-gray-900 px-2 py-1">{t("room.background")}</p>
                <input
                  ref={customBackgroundInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onCustomBackgroundSelected(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                {(
                  [
                    ["none", t("room.bg_none")],
                    ["blur", t("room.bg_blur")],
                    ["remove", t("room.bg_remove")],
                    ["filter-purple", t("room.bg_purple")],
                    ["filter-warm", t("room.bg_warm")],
                    ["bg-office", t("room.bg_office")],
                    ["bg-scenic", t("room.bg_scenic")],
                    ["bg-workspace", t("room.bg_workspace")],
                    ["bg-library", t("room.bg_library")],
                  ] as [BackgroundEffect, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setBackgroundEffect(val);
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left rounded-lg px-2 py-1.5 hover:bg-[#F3EEF8] ${
                      backgroundEffect === val ? "bg-[#F3EEF8] text-[#5D3A8C] font-medium" : ""
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => customBackgroundInputRef.current?.click()}
                  className={`w-full text-left rounded-lg px-2 py-1.5 hover:bg-[#F3EEF8] ${
                    backgroundEffect === "bg-custom"
                      ? "bg-[#F3EEF8] text-[#5D3A8C] font-medium"
                      : ""
                  }`}
                >
                  {t("room.upload_custom")}
                </button>
              </div>
            )}
          </div>
          )}
          {/* Mic button + live level meter */}
          <div className="flex items-center gap-1.5">
            <TeamsBarBtn label={t("room.mic")} active={audioOn} onClick={toggleMic}>
              {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </TeamsBarBtn>
            <div className="flex flex-col items-center gap-0.5">
              <MicLevelMeter level={micLevel} active={audioOn} />
              {micDetected === false && (
                <span className="text-[9px] text-red-500 font-medium leading-none">No mic</span>
              )}
            </div>
          </div>
          <TeamsBarBtn label={t("room.share")} active={screenSharing} onClick={toggleScreenShare}>
            {screenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </TeamsBarBtn>
          <button type="button" onClick={leaveMeeting} className="ml-2 flex flex-col items-center gap-0.5 rounded-lg bg-red-600 px-4 py-1.5 text-white hover:bg-red-700">
            <PhoneOff className="h-4 w-4" />
            <span className="text-[10px] font-medium">{t("room.leave")}</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="shrink-0 bg-amber-100 px-4 py-2 text-sm text-amber-900">{error}</p>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="relative flex flex-1 flex-col min-h-0 p-3">
          <div className={`grid flex-1 gap-3 min-h-[200px] ${viewMode === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            <div className="relative overflow-hidden rounded-xl bg-gray-800">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover ${phoneMode || !videoOn ? "hidden" : ""}`}
              />
              {screenSharing && (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
              )}
              {(phoneMode || !videoOn) && !screenSharing && (
                <div className="flex h-full min-h-[160px] items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-3xl font-semibold">
                      {session?.user?.name?.[0] || "?"}
                    </p>
                    <p className="mt-1 text-sm opacity-80">
                      {phoneMode ? t("room.phone_call") : t("room.camera_off")}
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
                {t("room.you")} {handRaised && "✋"}
              </div>
            </div>

            {remoteParticipants.map((p) => (
              <div key={p.userId} className="relative overflow-hidden rounded-xl bg-gray-800">
                <video
                  ref={(el) => {
                    if (el) remoteVideosRef.current.set(p.userId, el);
                  }}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover min-h-[160px]"
                />
                {!p.videoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <p className="text-2xl font-semibold">{p.name[0]}</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
                  {p.name}
                  {p.handRaised && " ✋"}
                  {p.screenSharing && " 🖥"}
                </div>
              </div>
            ))}
          </div>

          {reactionAnims.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute bottom-24 text-4xl meeting-reaction-float"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </span>
          ))}

          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
            <button
              type="button"
              title={t("room.quick_note")}
              onClick={() => setShowQuickNotes((s) => !s)}
              className="flex items-center gap-2 rounded-xl bg-white/95 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-800 shadow-lg hover:bg-[#F3EEF8]"
            >
              <StickyNote className="h-4 w-4 text-[#5D3A8C]" />
              {t("room.notes_btn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel(panel === "whiteboard" ? "none" : "whiteboard");
                setShowQuickNotes(false);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-lg ${
                panel === "whiteboard"
                  ? "bg-[#5D3A8C] text-white border-[#5D3A8C]"
                  : "bg-white/95 border-gray-200 text-gray-800 hover:bg-[#F3EEF8]"
              }`}
            >
              <PenTool className="h-4 w-4" />
              {t("room.whiteboard")}
            </button>
          </div>

          {showQuickNotes && (
            <div className="absolute bottom-4 left-36 z-20 w-80 rounded-xl bg-white border border-gray-200 shadow-xl p-3">
              <p className="text-xs font-semibold text-[#5D3A8C] mb-2">{t("room.personal_note")}</p>
              <input
                className="input-field text-xs mb-2"
                placeholder={t("room.note_title_placeholder")}
                value={quickNoteTitle}
                onChange={(e) => setQuickNoteTitle(e.target.value)}
              />
              <div className="flex items-center gap-2 mb-2">
                <EmojiPicker
                  onInsert={(emoji) =>
                    setQuickNote((c) =>
                      insertEmojiAtCursor(c, emoji, quickNoteRef.current)
                    )
                  }
                />
              </div>
              <textarea
                ref={quickNoteRef}
                className="input-field min-h-[80px] text-xs"
                placeholder={t("room.jot_down")}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
              />
              <button type="button" onClick={saveQuickNote} className="btn-primary w-full mt-2 text-xs py-2">
                {t("room.save_to_notes")}
              </button>
            </div>
          )}

        </div>

        {panel !== "none" && (
          <aside
            className={`shrink-0 bg-white border-l border-gray-200 flex flex-col ${
              panel === "whiteboard" ? "w-[min(100%,520px)] flex-1" : "w-80"
            }`}
          >
            {panel === "whiteboard" && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
                  <span>{t("room.meeting_whiteboard")}</span>
                  <button
                    type="button"
                    className="text-xs text-gray-500"
                    onClick={() => setPanel("none")}
                  >
                    {t("general.close")}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <WhiteboardCanvas
                    embedded
                    roomCode={roomCode}
                    onPresentToMeeting={presentWhiteboardStream}
                    onSaved={(msg) => setToast({ msg, type: "success" })}
                  />
                </div>
              </div>
            )}
            {panel === "people" && (
              <>
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between gap-2">
                  <span>{t("room.people")} ({participants.length})</span>
                  {isHostOrCoHost && (
                    <button
                      type="button"
                      onClick={() => setShowInvite((s) => !s)}
                      className="flex items-center gap-1 text-xs text-[#5D3A8C] hover:underline"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("room.invite_members")}
                    </button>
                  )}
                </div>
                {showInvite && isHostOrCoHost && (
                  <div className="border-b p-3 bg-[#F9F7FC] space-y-2">
                    <p className="text-xs font-medium text-gray-600">{t("room.select_to_invite")}</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {orgUsers.length === 0 ? (
                        <li className="text-gray-400">{t("room.no_users_to_invite")}</li>
                      ) : (
                        orgUsers.map((u) => (
                          <li key={u.id}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={inviteSelected.has(u.id)}
                                onChange={(e) => {
                                  setInviteSelected((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(u.id);
                                    else next.delete(u.id);
                                    return next;
                                  });
                                }}
                              />
                              <span className="truncate">{u.name || u.email}</span>
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                    <button
                      type="button"
                      disabled={inviting || inviteSelected.size === 0}
                      onClick={inviteMembers}
                      className="btn-primary w-full text-xs py-1.5 disabled:opacity-40"
                    >
                      {inviting ? t("meetings.creating") : t("room.ring_invited")}
                    </button>
                  </div>
                )}
                <ul className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
                  {participants.map((p) => (
                    <li key={p.userId} className="flex flex-col gap-1.5 rounded-lg border border-gray-100 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium flex items-center gap-1">
                          {p.name}
                          {p.isHost && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                              {t("room.host_badge")}
                            </span>
                          )}
                          {p.isCoHost && !p.isHost && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                              {t("room.cohost_badge")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {p.handRaised && "✋ "}
                          {p.screenSharing && "🖥 "}
                          {!p.audioOn && "🔇 "}
                          {p.micLocked && "🔒🎤 "}
                          {!p.videoOn && "📷 "}
                          {p.cameraLocked && "🔒📷 "}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {panel === "chat" && (
              <>
                <div className="px-4 py-3 border-b font-medium text-sm">{t("room.meeting_chat")}</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
                  {chatLines.map((c, i) => (
                    <div key={i}>
                      <strong>{c.name}:</strong> {c.text}
                      {c.attachmentPath && (
                        <a
                          href={c.attachmentPath}
                          download={c.attachmentName || true}
                          className="inline-flex items-center gap-1 text-[#5D3A8C] underline text-xs mt-1"
                        >
                          {t("room.download_file")} {c.attachmentName || t("room.file")}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => { e.preventDefault(); await sendMeetingChat(); }}
                  className="border-t p-2 flex gap-1 items-center"
                >
                  <input type="file" accept="image/*,video/*" className="hidden" id="meet-media" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMeetingAttachment(f); e.target.value = ""; }} />
                  <input type="file" className="hidden" id="meet-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMeetingAttachment(f); e.target.value = ""; }} />
                  <button type="button" onClick={() => document.getElementById("meet-media")?.click()} className="p-2 text-gray-500 hover:text-[#5D3A8C]" title={t("chat.attach_media")}><ImageIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => document.getElementById("meet-file")?.click()} className="p-2 text-gray-500 hover:text-[#5D3A8C]" title={t("chat.attach_file")}><Paperclip className="h-4 w-4" /></button>
                  <input className="input-field flex-1 text-xs py-2" placeholder={t("discussion.type_message")} value={chat} onChange={(e) => setChat(e.target.value)} disabled={meetingChatUploading} />
                  <button type="submit" className="btn-primary px-3 py-2 text-xs" disabled={meetingChatUploading}>{t("general.send")}</button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function TeamsBarBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-gray-700 transition min-w-[52px] ${
        active ? "bg-[#F3EEF8] text-[#5D3A8C]" : "hover:bg-gray-100"
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-full p-3 text-white transition ${
        active ? "bg-[#5D3A8C]" : "bg-gray-700 hover:bg-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

/** Real-time microphone audio level meter */
function MicLevelMeter({ level, active }: { level: number; active: boolean }) {
  const BAR_COUNT = 5;
  // Each bar has a threshold — lights up when level exceeds it
  const thresholds = [5, 20, 40, 62, 82];
  return (
    <div
      title={active ? `Mic level: ${Math.round(level)}%` : "Mic is muted"}
      className="flex items-end gap-[2px] h-5 px-0.5"
    >
      {thresholds.map((threshold, i) => {
        const lit = active && level >= threshold;
        const height = 4 + i * 3; // px heights: 4,7,10,13,16
        return (
          <div
            key={i}
            style={{ height: `${height}px`, width: "3px" }}
            className={`rounded-sm transition-all duration-75 ${
              lit
                ? level > 80
                  ? "bg-red-500"
                  : level > 50
                    ? "bg-amber-400"
                    : "bg-green-500"
                : active
                  ? "bg-gray-300"
                  : "bg-gray-200"
            }`}
          />
        );
      })}
    </div>
  );
}
