"use client";

import { useState } from "react";
import { isImageMime, isVideoMime } from "@/lib/upload-client";
import { Download, FileText, Copy, Check, Video } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/ui/UserAvatar";

function looksEncrypted(s: string): boolean {
  return /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]*$/i.test(s);
}

type Author = { name: string | null; email: string; id?: string; image?: string | null };

/** Extract the first /meetings/room/<code> URL from text, if any */
function extractMeetingLink(text: string): { url: string; roomCode: string } | null {
  const match = text.match(/https?:\/\/[^\s]+\/dashboard\/meetings\/room\/([A-Z0-9]+)/);
  if (!match) return null;
  return { url: match[0], roomCode: match[1] };
}

/** Inline meeting invite card shown inside DM when a meeting link is detected */
function MeetingLinkCard({ url, roomCode, isOwn }: { url: string; roomCode: string; isOwn?: boolean }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* skip */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`mt-1.5 rounded-xl border p-3 flex flex-col gap-2 ${
      isOwn ? "border-white/20 bg-white/10" : "border-[#5D3A8C]/15 bg-[#F3EEF8]"
    }`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isOwn ? "bg-white/20" : "bg-[#5D3A8C]"}`}>
          <Video className={`h-3.5 w-3.5 ${isOwn ? "text-white" : "text-white"}`} />
        </div>
        <div>
          <p className={`text-xs font-semibold ${isOwn ? "text-white" : "text-[#5D3A8C]"}`}>{t("discussion.meeting_room")}</p>
          <p className={`text-[10px] font-mono ${isOwn ? "text-white/60" : "text-gray-500"}`}>{t("discussion.room_code")}: {roomCode}</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isOwn
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-[#5D3A8C] text-white hover:bg-[#4A2E70]"
          }`}
        >
          <Video className="h-3 w-3" /> {t("meeting.join")}
        </a>
        <button
          onClick={copy}
          title={t("chat.copy_link")}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            isOwn
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-white border border-[#5D3A8C]/20 text-[#5D3A8C] hover:bg-[#F3EEF8]"
          }`}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t("general.copied") : t("general.copy")}
        </button>
      </div>
    </div>
  );
}

/** Renders the attachment outside the chat bubble (no background) */
function MediaAttachment({
  path,
  name,
  mime,
  isOwn,
}: {
  path: string;
  name?: string | null;
  mime?: string | null;
  isOwn?: boolean;
}) {
  const { t } = useLanguage();
  const label = name || t("chat.download");
  const isImage = mime && isImageMime(mime);
  const isVideo = mime && isVideoMime(mime);
  const isFile = mime && !isImage && !isVideo;

  return (
    <div className={`mb-1 ${isOwn ? "flex flex-col items-end" : ""}`}>
      {isImage && (
        <img
          src={path}
          alt={label}
          className="max-h-56 max-w-xs rounded-xl shadow-sm object-cover"
        />
      )}
      {isVideo && (
        <video
          src={path}
          controls
          className="max-h-56 max-w-xs rounded-xl shadow-sm"
        />
      )}
      {isFile && (
        <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
          isOwn
            ? "border-[#5D3A8C]/30 bg-[#F3EEF8] text-[#5D3A8C]"
            : "border-gray-200 bg-white text-gray-700"
        }`}>
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[180px] text-sm">{label}</span>
        </div>
      )}
      <a
        href={path}
        download={name || true}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
          isOwn
            ? "bg-[#5D3A8C]/10 text-[#5D3A8C] hover:bg-[#5D3A8C]/20"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Download className="h-3 w-3" />
        {t("chat.download")}
      </a>
    </div>
  );
}

export function MessageBubble({
  content,
  author,
  createdAt,
  attachmentPath,
  attachmentName,
  attachmentMime,
  isOwn,
  reactions,
  onReact,
  reactOnly,
}: {
  content: string;
  author: Author;
  createdAt: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  isOwn?: boolean;
  reactions?: { emoji: string; userId: string }[];
  onReact?: (emoji: string) => void;
  reactOnly?: boolean;
}) {
  const grouped = (reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const visibleText =
    content && !looksEncrypted(content) ? content.trim() : "";

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <UserAvatar
        name={author.name}
        email={author.email}
        image={author.image}
        size="md"
      />

      {/* Message content */}
      <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
        {/* Author + time */}
        <p className="text-xs text-gray-500">
          {author.name || author.email}
          <span className="ml-2">
            {new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>

        {/* Media/file attachment — outside the bubble, no background */}
        {attachmentPath && (
          <div className="mt-1">
            <MediaAttachment
              path={attachmentPath}
              name={attachmentName}
              mime={attachmentMime}
              isOwn={isOwn}
            />
          </div>
        )}

        {/* Text bubble — only shown if there's text content */}
        {visibleText && (
          <div
            className={`mt-1 inline-block rounded-2xl px-4 py-2.5 text-sm text-left ${
              isOwn ? "bg-[#5D3A8C] text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{visibleText}</p>
            {/* Inline meeting card if this message contains a meeting link */}
            {(() => {
              const meeting = extractMeetingLink(visibleText);
              return meeting ? (
                <MeetingLinkCard url={meeting.url} roomCode={meeting.roomCode} isOwn={isOwn} />
              ) : null;
            })()}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(grouped).length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(grouped).map(([emoji, count]) => (
              <span
                key={emoji}
                className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs shadow-sm"
              >
                {emoji} {count > 1 ? count : ""}
              </span>
            ))}
          </div>
        )}

        {/* React buttons */}
        {onReact && (
          <div className={`mt-1 flex gap-0.5 ${isOwn ? "justify-end" : ""}`}>
            {["👍", "❤️", "👏", "😂", "🎉"].map((e) => (
              <button
                key={e}
                type="button"
                title={reactOnly ? "React" : "Add reaction"}
                onClick={() => onReact(e)}
                className="text-base opacity-70 hover:opacity-100 hover:scale-125 transition"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
