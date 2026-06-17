"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Sparkles, Users } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";

type Note = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  createdAt: string;
  author: { name: string | null };
};

/** Extract participants line from content if present */
function extractParticipants(content: string): { participants: string; body: string } {
  const match = content.match(/^PARTICIPANTS:\s*(.+)\n/);
  if (match) {
    return { participants: match[1].trim(), body: content.slice(match[0].length) };
  }
  return { participants: "", body: content };
}

export function MeetingNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [participants, setParticipants] = useState("");
  const [showForm, setShowForm] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const res = await fetch("/api/notes/meetings");
    if (res.ok) setNotes(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    // Prepend participants line to content for storage
    const fullContent = participants.trim()
      ? `PARTICIPANTS: ${participants.trim()}\n${content}`
      : content;
    const summary = content.length > 100 ? content.slice(0, 120) + "…" : content;
    await fetch("/api/notes/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Meeting Notes", content: fullContent, summary }),
    });
    setTitle("");
    setContent("");
    setParticipants("");
    setShowForm(false);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Meeting Notes"
        description="Capture meetings with auto-summary, encrypted for your team"
        help="Notes are encrypted at rest. Use bullet points for best summaries."
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New meeting
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6 p-6 space-y-4">
          <input
            className="input-field"
            placeholder="Meeting title (e.g. Sprint Planning)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {/* Participants field */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#5D3A8C]" />
              Attendees / Team Members
            </label>
            <input
              className="input-field"
              placeholder="e.g. Alice, Bob, Charlie (comma-separated)"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <EmojiPicker
              onInsert={(emoji) =>
                setContent((c) =>
                  insertEmojiAtCursor(c, emoji, contentRef.current)
                )
              }
            />
            <span className="text-xs text-gray-500">Add emoji</span>
          </div>
          <textarea
            ref={contentRef}
            className="input-field min-h-[200px] resize-y"
            placeholder="Agenda, discussion, decisions, action items…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary">
              Save notes
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
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
                  <h3 className="font-semibold text-gray-900">{n.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {n.author.name} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-[#5D3A8C] shrink-0" />
              </div>
              {n.summary && (
                <div className="mt-3 rounded-lg bg-[#F3EEF8] p-3 text-sm text-[#5D3A8C]">
                  <strong>Executive Summary:</strong> {n.summary}
                </div>
              )}
              {pList && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-500">Attendees:</span>
                  {pList.split(",").map((p) => p.trim()).filter(Boolean).map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                {body}
              </p>
            </div>
          );
        })}
        {notes.length === 0 && (
          <p className="text-center text-gray-500 py-12">
            No meeting notes yet. Click &quot;New meeting&quot; to start.
          </p>
        )}
      </div>
    </div>
  );
}
