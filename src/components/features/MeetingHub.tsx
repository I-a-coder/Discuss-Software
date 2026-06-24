"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Sparkles, Video, Link2, Upload, MessageCircleQuestion,
  Copy, ExternalLink, Users, CalendarClock, Trash2, Mail, UserPlus,
  Clock, Check, Calendar,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";
import { MeetingMinutesDisplay } from "./MeetingMinutesDisplay";
import { useLanguage } from "@/contexts/LanguageContext";

function extractParticipants(content: string): { participants: string; body: string } {
  const match = content.match(/^PARTICIPANTS:\s*(.+)\n/);
  if (match) return { participants: match[1].trim(), body: content.slice(match[0].length) };
  return { participants: "", body: content };
}

type Note = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  meetingLink: string | null;
  meetingId: string | null;
  createdAt: string;
  author: { name: string | null };
};

type Meeting = {
  id: string;
  roomCode: string;
  title: string;
  meetingLink: string;
  status: string;
  startedAt: string;
};

type OrgUser = { id: string; name: string | null; email: string };

type ScheduledMeeting = {
  id: string;
  title: string;
  roomCode: string;
  meetingLink: string;
  scheduledAt: string;
  hostId: string;
  attendees: OrgUser[];
  attendeeEmails: string[];
  dmsSent?: number;
  emailsQueued?: number;
};

function MeetingHubInner() {
  const { t, td, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<"meetings" | "ai" | "notes" | "schedule">("meetings");
  const [notes, setNotes] = useState<Note[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI tab state
  const [aiLink, setAiLink] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [aiMinutes, setAiMinutes] = useState("");
  const [aiParticipants, setAiParticipants] = useState<string[]>([]);
  const [aiParticipantsInput, setAiParticipantsInput] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUpload, setRecordingUpload] = useState<{ path: string; name: string; mime: string } | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const recordingInputRef = useRef<HTMLInputElement>(null);

  // Notes tab state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteParticipants, setNoteParticipants] = useState("");
  const [showForm, setShowForm] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Schedule tab state
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [schedUserIds, setSchedUserIds] = useState<Set<string>>(new Set());
  const [schedEmails, setSchedEmails] = useState("");
  const [schedUserSearch, setSchedUserSearch] = useState("");
  const [schedCreating, setSchedCreating] = useState(false);
  const [schedSuccess, setSchedSuccess] = useState<string | null>(null);
  const [schedCalendarInfo, setSchedCalendarInfo] = useState<{ created: boolean; provider: string | null } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [hasCalendar, setHasCalendar] = useState<boolean | null>(null);

  const ended = searchParams.get("ended");
  const linkFromUrl = searchParams.get("link");

  useEffect(() => {
    if (linkFromUrl) { setAiLink(decodeURIComponent(linkFromUrl)); setTab("ai"); }
  }, [linkFromUrl]);

  // Auto-detect participants from meeting transcript when a meeting link is entered
  useEffect(() => {
    if (tab !== "ai" || !aiLink.trim()) return;
    const code = aiLink.trim().split("/").pop()?.toUpperCase();
    if (!code || code.length < 4) return;

    let cancelled = false;
    fetch(`/api/meetings/${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.meeting?.transcript) return;
        const transcript: string = d.meeting.transcript || "";
        const names = [
          ...new Set(
            transcript
              .split("\n")
              .map((l: string) => {
                const stripped = l.replace(/^\[[^\]]+\]\s*/, "").trim();
                return stripped.match(/^(.+?)\s+joined the meeting$/i)?.[1]?.trim();
              })
              .filter((n): n is string => typeof n === "string" && n.length > 0 && n.length < 80)
          ),
        ];
        if (names.length > 0) {
          // Only auto-fill if the user hasn't typed anything manually
          setAiParticipantsInput((prev) => (prev.trim() ? prev : names.join(", ")));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [aiLink, tab]);

  async function loadNotes() {
    const res = await fetch("/api/notes/meetings");
    if (res.ok) setNotes(await res.json());
  }
  async function loadMeetings() {
    const res = await fetch("/api/meetings");
    if (res.ok) setMeetings(await res.json());
  }
  async function loadScheduled() {
    const res = await fetch("/api/meetings/scheduled");
    if (res.ok) setScheduledMeetings(await res.json());
  }

  useEffect(() => { loadNotes(); loadMeetings(); }, []);
  useEffect(() => { if (ended) setTab("ai"); }, [ended]);
  useEffect(() => {
    if (tab === "schedule") {
      loadScheduled();
      fetch("/api/chat/users?q=")
        .then((r) => r.json())
        .then((users: OrgUser[]) => setOrgUsers(Array.isArray(users) ? users : []))
        .catch(() => {});
    }
  }, [tab]);

  // Check if this user has a calendar connected (once)
  useEffect(() => {
    fetch("/api/calendar-sync/status")
      .then((r) => r.json())
      .then((d) => {
        const { google, microsoft } = d.connections;
        setHasCalendar(
          (google.connected && google.tokenStatus === "ok") ||
          (microsoft.connected && microsoft.tokenStatus === "ok")
        );
      })
      .catch(() => setHasCalendar(false));
  }, []);

  async function startMeeting() {
    setCreating(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle || "Team Meeting" }),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/dashboard/meetings/room/${data.roomCode}`);
    }
  }

  function joinMeeting() {
    const code = joinCode.trim().toUpperCase().replace(/.*\//, "");
    if (code) router.push(`/dashboard/meetings/room/${code}`);
  }

  async function generateMinutes() {
    setAiLoading(true);
    setAiAnswer("");
    const res = await fetch("/api/meetings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "minutes",
        meetingLink: aiLink || undefined,
        transcript: aiTranscript || undefined,
        recordingPath: recordingUpload?.path,
        recordingName: recordingUpload?.name || recordingFile?.name,
        targetLang: lang,
      }),
    });
    setAiLoading(false);
    if (res.ok) {
      const data = await res.json();
      setAiMinutes(data.minutes);
      if (data.meetingLink) setAiLink(data.meetingLink);
      // Resolve participants: explicit input → PARTICIPANTS: line in transcript → fallback empty
      const fromInput = aiParticipantsInput
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (fromInput.length > 0) {
        setAiParticipants(fromInput);
      } else {
        // 1. Try explicit PARTICIPANTS: header in transcript
        const transcriptMatch = aiTranscript.match(/^PARTICIPANTS:\s*(.+)/im);
        if (transcriptMatch) {
          const names = transcriptMatch[1].split(",").map((p: string) => p.trim()).filter(Boolean);
          setAiParticipants(names);
          setAiParticipantsInput(names.join(", "));
        } else {
          // 2. Auto-detect from the generated minutes' ## Participants section
          const minutesParticipantsMatch = data.minutes.match(
            /##\s*Participants\s*\n([\s\S]*?)(?=\n##|\n```|$)/i
          );
          if (minutesParticipantsMatch) {
            const pLine = minutesParticipantsMatch[1].trim();
            const detected = pLine
              .split(",")
              .map((p: string) => p.trim().replace(/^[-*_]\s*/, "").replace(/_+$/, ""))
              .filter(
                (p: string) => p.length > 0 && !/not available|participant list/i.test(p) && !p.startsWith("(")
              );
            if (detected.length > 0) {
              setAiParticipants(detected);
              setAiParticipantsInput(detected.join(", "));
            }
          }
        }
      }
      loadNotes();
    }
  }

  async function deleteRecentMeeting(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setDeletingId(null);

    const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert(td("Failed to delete meeting."));
    }
  }

  async function askMeeting() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    const res = await fetch("/api/meetings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ask", question: aiQuestion,
        meetingLink: aiLink || undefined,
        transcript: aiTranscript || aiMinutes || undefined,
      }),
    });
    setAiLoading(false);
    if (res.ok) { const data = await res.json(); setAiAnswer(data.answer); }
  }

  async function uploadRecording(file: File) {
    setRecordingFile(file);
    setUploadingRecording(true);
    setRecordingUpload(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) { const err = await res.json(); alert(err.error || t("meetings.upload_failed")); setRecordingFile(null); return; }
      const data = await res.json();
      setRecordingUpload(data);
      if (!aiLink && file.name) {
        const match = file.name.match(/yusi-meeting-([A-Z0-9]+)/i);
        if (match) setAiLink(`${window.location.origin}/dashboard/meetings/room/${match[1].toUpperCase()}`);
      }
    } finally { setUploadingRecording(false); }
  }

  function onRecordingPick(file: File | null) {
    if (!file) { setRecordingFile(null); setRecordingUpload(null); return; }
    void uploadRecording(file);
  }

  async function saveManualNote() {
    const fullContent = noteParticipants.trim()
      ? `PARTICIPANTS: ${noteParticipants.trim()}\n${content}`
      : content;
    const summary = content.length > 100 ? content.slice(0, 120) + "…" : content;
    await fetch("/api/notes/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Meeting Notes", content: fullContent, summary, meetingLink: aiLink || undefined }),
    });
    setTitle(""); setContent(""); setNoteParticipants(""); setShowForm(false); loadNotes();
  }

  // ── Schedule functions ──
  function getMaxDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  function toggleAttendee(id: string) {
    setSchedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function createScheduledMeeting() {
    if (!schedDate || !schedTime) return;
    setSchedCreating(true);
    setSchedSuccess(null);
    setSchedCalendarInfo(null);
    const scheduledAt = new Date(`${schedDate}T${schedTime}`).toISOString();
    const emailList = schedEmails.split(",").map((e) => e.trim()).filter(Boolean);
    const res = await fetch("/api/meetings/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: schedTitle || "Scheduled Meeting",
        scheduledAt,
        attendeeUserIds: [...schedUserIds],
        attendeeEmails: emailList,
      }),
    });
    setSchedCreating(false);
    if (res.ok) {
      const data = await res.json();
      setSchedCalendarInfo({
        created:  !!data.calendarEventCreated,
        provider: data.calendarProvider ?? null,
      });
      setSchedSuccess(
        `Meeting scheduled! ${data.dmsSent} DM${data.dmsSent !== 1 ? "s" : ""} sent` +
        (data.emailsQueued > 0 ? `, ${data.emailsQueued} external email${data.emailsQueued !== 1 ? "s" : ""} queued.` : ".")
      );
      setSchedTitle(""); setSchedDate(""); setSchedTime("");
      setSchedUserIds(new Set()); setSchedEmails("");
      loadScheduled();
    }
  }

  async function cancelScheduled(id: string) {
    await fetch(`/api/meetings/scheduled/${id}`, { method: "DELETE" });
    loadScheduled();
  }

  async function copyLink(link: string, id: string) {
    await navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  const filteredOrgUsers = orgUsers.filter(
    (u) => !schedUserSearch || u.name?.toLowerCase().includes(schedUserSearch.toLowerCase()) || u.email.toLowerCase().includes(schedUserSearch.toLowerCase())
  );

  const TABS = [
    { id: "meetings" as const, label: t("meetings.tab_join") },
    { id: "ai" as const, label: t("meetings.tab_ai") },
    { id: "notes" as const, label: t("meetings.tab_notes") },
    { id: "schedule" as const, label: t("meetings.schedule" as any) },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.meeting_notes")}
        description={t("meetings.desc")}
        help={t("meetings.help")}
        action={
          <button onClick={() => { setTab("meetings"); setNewTitle(""); }} className="btn-primary">
            <Video className="h-4 w-4" /> {t("meetings.new_call")}
          </button>
        }
      />

      {ended && (
        <p className="mb-4 rounded-xl bg-[#F3EEF8] px-4 py-3 text-sm text-[#5D3A8C]">
          {t("meetings.call_ended_msg")}
        </p>
      )}

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id} type="button" onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === id ? "border-[#5D3A8C] text-[#5D3A8C]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MEETINGS TAB ── */}
      {tab === "meetings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t("meetings.start_meeting")}</h3>
            <input className="input-field" placeholder={t("meetings.meeting_title_placeholder")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <button onClick={startMeeting} disabled={creating} className="btn-primary w-full">
              <Video className="h-4 w-4" />
              {creating ? t("meetings.creating") : t("meetings.start_video")}
            </button>
            <p className="text-xs text-gray-500">{t("meetings.start_hint")}</p>
          </div>
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t("meetings.join_title")}</h3>
            <input className="input-field" placeholder={t("meetings.join_placeholder")} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
            <button onClick={joinMeeting} className="btn-secondary w-full">
              <Link2 className="h-4 w-4" /> {t("meetings.join_btn")}
            </button>
          </div>
          {meetings.length > 0 && (
            <div className="card p-6 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-3">{t("meetings.recent")}</h3>
              <ul className="space-y-2">
                {meetings.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 p-3 text-sm">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.status} · {new Date(m.startedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => navigator.clipboard.writeText(m.meetingLink)}>
                        <Copy className="h-3 w-3" /> {t("meetings.link")}
                      </button>
                      <Link href={`/dashboard/meetings/room/${m.roomCode}`} className="btn-primary text-xs py-1.5">
                        <ExternalLink className="h-3 w-3" /> {t("meetings.open")}
                      </Link>
                      <button
                        type="button"
                        className={`p-1.5 rounded transition flex items-center gap-1 ${
                          deletingId === m.id
                            ? "text-red-600 hover:bg-red-50 font-medium text-xs px-2"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        }`}
                        title={deletingId === m.id ? td("Click again to confirm delete") : td("Delete meeting history")}
                        onClick={() => deleteRecentMeeting(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === m.id && <span>{td("Confirm?")}</span>}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── AI TAB ── */}
      {tab === "ai" && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-[#5D3A8C]">
              <Sparkles className="h-5 w-5" /> {t("meetings.ai_notes_title")}
            </h3>
            <p className="text-sm text-gray-600">{t("meetings.ai_notes_desc")}</p>
            <input className="input-field" placeholder={t("meetings.meeting_link_placeholder")} value={aiLink} onChange={(e) => setAiLink(e.target.value)} />
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center transition ${recordingUpload ? "border-green-300 bg-green-50/50" : uploadingRecording ? "border-[#5D3A8C]/40 bg-[#F3EEF8]/50" : "border-[#5D3A8C]/30 bg-[#F3EEF8]/30 hover:border-[#5D3A8C]/50"}`}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#5D3A8C]"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#5D3A8C]"); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-[#5D3A8C]"); const file = e.dataTransfer.files?.[0]; if (file) onRecordingPick(file); }}
            >
              <input ref={recordingInputRef} type="file" accept="video/webm,video/mp4,video/*,audio/webm,audio/mpeg,audio/*" className="hidden" onChange={(e) => onRecordingPick(e.target.files?.[0] || null)} />
              <Upload className="mx-auto h-8 w-8 text-[#5D3A8C]" />
              <p className="mt-2 text-sm font-medium text-gray-800">{t("meetings.drop_recording")}</p>
              <p className="mt-1 text-xs text-gray-500">{t("meetings.recording_formats")}</p>
              {uploadingRecording && <p className="mt-2 text-xs text-[#5D3A8C] animate-pulse">{t("meetings.uploading")}</p>}
              {recordingUpload && !uploadingRecording && <p className="mt-2 text-xs font-medium text-green-700">✓ {recordingUpload.name} — {t("meetings.uploaded")}</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" disabled={uploadingRecording} onClick={() => recordingInputRef.current?.click()} className="btn-secondary text-xs py-2">
                  <Upload className="h-3.5 w-3.5" /> {t("meetings.choose_file")}
                </button>
                {recordingUpload && (
                  <button type="button" onClick={() => onRecordingPick(null)} className="text-xs text-gray-500 underline hover:text-red-600">{t("meetings.clear_file")}</button>
                )}
              </div>
            </div>
            <textarea className="input-field min-h-[100px]" placeholder={t("meetings.transcript_placeholder")} value={aiTranscript} onChange={(e) => setAiTranscript(e.target.value)} />
            {/* Participants for the minutes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#5D3A8C]" /> {td("Attendees (shown under Executive Summary)")}
              </label>
              <input
                className="input-field"
                placeholder={td("e.g. Alice, Bob, Charlie (comma-separated)")}
                value={aiParticipantsInput}
                onChange={(e) => setAiParticipantsInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">{td("Leave blank to auto-detect from transcript.")}</p>
            </div>
            <button onClick={generateMinutes} disabled={aiLoading || uploadingRecording || (!aiLink && !aiTranscript && !recordingUpload)} className="btn-primary">
              <Sparkles className="h-4 w-4" />
              {aiLoading ? t("meetings.generating") : t("meetings.generate_minutes")}
            </button>
          </div>
          {aiMinutes && <MeetingMinutesDisplay markdown={aiMinutes} title={t("meetings.minutes_title")} participants={aiParticipants} />}
          <div className="card p-6 space-y-4">
            <h4 className="flex items-center gap-2 font-semibold text-gray-900">
              <MessageCircleQuestion className="h-5 w-5 text-[#5D3A8C]" /> {t("meetings.ask_title")}
            </h4>
            <input className="input-field" placeholder={t("meetings.ask_placeholder")} value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} />
            <button onClick={askMeeting} disabled={aiLoading || !aiQuestion.trim()} className="btn-secondary">{t("ai.title")}</button>
            {aiAnswer && <p className="rounded-xl bg-[#F3EEF8] p-4 text-sm text-gray-800 whitespace-pre-wrap">{aiAnswer}</p>}
          </div>
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {tab === "notes" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> {t("meetings.manual_note")}
            </button>
          </div>
          {showForm && (
            <div className="card mb-6 p-6 space-y-4">
              <input className="input-field" placeholder={t("meetings.meeting_title_placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#5D3A8C]" /> {td("Attendees / Team Members")}
                </label>
                <input className="input-field" placeholder={td("e.g. Alice, Bob, Charlie (comma-separated)")} value={noteParticipants} onChange={(e) => setNoteParticipants(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <EmojiPicker onInsert={(emoji) => setContent((c) => insertEmojiAtCursor(c, emoji, contentRef.current))} />
              </div>
              <textarea ref={contentRef} className="input-field min-h-[200px] resize-y" placeholder={t("meetings.attendees_placeholder")} value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={saveManualNote} className="btn-primary">{t("meetings.save_note")}</button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">{t("general.cancel")}</button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {notes.map((n) => {
              const { participants: pList, body } = extractParticipants(n.content);
              return (
                <div key={n.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{td(n.title)}</h3>
                      <p className="text-xs text-gray-500 mt-1">{n.author.name} · {new Date(n.createdAt).toLocaleString()}</p>
                      {n.meetingLink && <p className="text-xs text-[#5D3A8C] mt-1 truncate max-w-md">{n.meetingLink}</p>}
                    </div>
                    <Sparkles className="h-5 w-5 text-[#5D3A8C] shrink-0" />
                  </div>
                  {n.summary && (
                    <div className="mt-3 rounded-lg bg-[#F3EEF8] p-3 text-sm text-[#5D3A8C]">
                      <strong>{t("meetings.minutes_title")}:</strong> {td(n.summary)}
                    </div>
                  )}
                  {pList && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-500">{t("meetings.attendees_label" as any)}:</span>
                      {pList.split(",").map((p) => p.trim()).filter(Boolean).map((p) => (
                        <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{p}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{td(body)}</p>
                  <button type="button" className="mt-3 text-xs text-[#5D3A8C] underline"
                    onClick={() => { setAiLink(n.meetingLink || ""); setAiTranscript(n.content); setTab("ai"); }}>
                    {t("meetings.tab_ai")} →
                  </button>
                </div>
              );
            })}
            {notes.length === 0 && <p className="text-center text-gray-500 py-12">{t("meetings.no_saved_notes")}</p>}
          </div>
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {tab === "schedule" && (
        <div className="space-y-6">
          {/* Create form */}
          <div className="card p-6 space-y-5">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <CalendarClock className="h-5 w-5 text-[#5D3A8C]" />
              {t("meetings.schedule_future" as any)}
            </h3>
            <p className="text-sm text-gray-500">{t("meetings.schedule_hint" as any)}</p>

            {schedSuccess && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  <Check className="h-4 w-4 shrink-0" /> {schedSuccess}
                </div>

                {/* Calendar sync feedback */}
                {schedCalendarInfo?.created ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[#F3EEF8] border border-[#5D3A8C]/20 px-4 py-2.5 text-sm text-[#5D3A8C]">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Calendar event created on{" "}
                      <strong>{schedCalendarInfo.provider === "google" ? "Google Calendar" : "Microsoft 365"}</strong>
                      {" "}Attendees will receive a calendar invite.
                    </span>
                  </div>
                ) : hasCalendar === false ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      💡 Connect your calendar in{" "}
                      <a
                        href="/dashboard/settings?tab=calendar"
                        className="font-semibold underline hover:no-underline"
                      >
                        Settings
                      </a>
                      {" "}to automatically send real calendar invites to attendees.
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("meetings.meeting_title_label" as any)}</label>
                <input className="input-field" placeholder="e.g. Sprint Planning" value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t("meetings.date_label" as any)}</span>
                  </label>
                  <input
                    type="date" className="input-field text-sm"
                    min={new Date().toISOString().split("T")[0]}
                    max={getMaxDate()}
                    value={schedDate} onChange={(e) => setSchedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("meetings.time_label" as any)}</label>
                  <input type="time" className="input-field text-sm" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Team member attendee selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-[#5D3A8C]" /> {t("meetings.add_team_members" as any)}
              </label>
              <input
                className="input-field mb-2 text-sm"
                placeholder="Search by name or email…"
                value={schedUserSearch}
                onChange={(e) => setSchedUserSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {filteredOrgUsers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No team members found</p>
                )}
                {filteredOrgUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#F3EEF8] transition">
                    <input
                      type="checkbox"
                      checked={schedUserIds.has(u.id)}
                      onChange={() => toggleAttendee(u.id)}
                      className="h-4 w-4 accent-[#5D3A8C]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name || u.email}</p>
                      {u.name && <p className="text-xs text-gray-500 truncate">{u.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
              {schedUserIds.size > 0 && (
                <p className="mt-1.5 text-xs text-[#5D3A8C] font-medium">
                  {schedUserIds.size} {t("meetings.team_members_selected" as any)}
                </p>
              )}
            </div>

            {/* External email attendees */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#5D3A8C]" /> {t("meetings.external_attendees" as any)}
              </label>
              <input
                className="input-field"
                placeholder={td("jane@company.com, bob@agency.com (comma-separated)")}
                value={schedEmails}
                onChange={(e) => setSchedEmails(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                {td("External attendees get an email notification but must create a Yusi Discuss account to join.")}
              </p>
            </div>

            <button
              onClick={createScheduledMeeting}
              disabled={schedCreating || !schedDate || !schedTime}
              className="btn-primary"
            >
              <CalendarClock className="h-4 w-4" />
              {schedCreating ? t("meetings.scheduling" as any) : t("meetings.schedule_send" as any)}
            </button>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {t("meetings.upcoming_scheduled" as any)}
            </h3>
            {scheduledMeetings.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">{t("meetings.no_scheduled" as any)}</p>
            ) : (
              <ul className="space-y-3">
                {scheduledMeetings.map((m) => (
                  <li key={m.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{m.title}</h4>
                        <p className="text-sm text-[#5D3A8C] font-medium mt-0.5">
                          <Clock className="inline h-3.5 w-3.5 mr-1" />
                          {new Date(m.scheduledAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelScheduled(m.id)}
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Cancel meeting"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Attendees */}
                    {(m.attendees.length > 0 || m.attendeeEmails.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium">{t("meetings.attendees_label" as any)}:</span>
                        {m.attendees.map((a) => (
                          <span key={a.id} className="rounded-full bg-[#F3EEF8] px-2 py-0.5 text-xs text-[#5D3A8C]">
                            {a.name || a.email}
                          </span>
                        ))}
                        {m.attendeeEmails.map((email) => (
                          <span key={email} className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" />{email}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meeting link actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1.5"
                        onClick={() => copyLink(m.meetingLink, m.id)}
                      >
                        {copiedLink === m.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copiedLink === m.id ? t("ai.copied" as any) : t("chat.copy_link" as any)}
                      </button>
                      <Link href={`/dashboard/meetings/room/${m.roomCode}`} className="btn-primary text-xs py-1.5">
                        <ExternalLink className="h-3 w-3" /> {td("Open Room")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingHubLoading() {
  const { t } = useLanguage();
  return <p className="text-gray-500 p-8">{t("meetings.loading")}</p>;
}

export function MeetingHub() {
  return (
    <Suspense fallback={<MeetingHubLoading />}>
      <MeetingHubInner />
    </Suspense>
  );
}
