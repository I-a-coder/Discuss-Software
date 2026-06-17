"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Lock, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";
import { Toast } from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export function PersonalNotes() {
  const { t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const res = await fetch("/api/notes/personal");
    if (res.ok) setNotes(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function openNote(n?: Note) {
    if (n) {
      setActive(n);
      setTitle(n.title);
      setContent(n.content);
    } else {
      setActive({ id: "", title: "", content: "", updatedAt: "" });
      setTitle(t("notes.new_note"));
      setContent("");
    }
  }

  async function save() {
    const res = await fetch("/api/notes/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: active?.id || undefined,
        title: title.trim() || t("notes.untitled"),
        content,
      }),
    });
    if (res.ok) {
      setToast(active?.id ? t("notes.saved_success") : t("notes.created_success"));
      setActive(null);
      load();
    }
  }

  async function remove(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm(t("notes.confirm_delete"))) return;
    await fetch(`/api/notes/personal?id=${id}`, { method: "DELETE" });
    if (active?.id === id) setActive(null);
    setToast(t("notes.deleted"));
    load();
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <PageHeader
        title={t("notes.title")}
        description={t("notes.desc")}
        help={t("notes.help")}
        action={
          <button onClick={() => openNote()} className="btn-primary">
            <Plus className="h-4 w-4" /> {t("notes.new_note_btn")}
          </button>
        }
      />

      <div className="flex gap-6">
        <div className="w-72 shrink-0 space-y-2">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-3 text-sm transition ${
                active?.id === n.id
                  ? "border-[#5D3A8C] bg-[#F3EEF8]"
                  : "border-gray-200 hover:border-[#5D3A8C]/50"
              }`}
            >
              <button
                type="button"
                onClick={() => openNote(n)}
                className="w-full text-left"
              >
                <p className="font-medium truncate">{n.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.updatedAt).toLocaleDateString()}
                </p>
              </button>
              <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => openNote(n)}
                  className="text-xs text-[#5D3A8C] flex items-center gap-1 hover:underline"
                >
                  <Pencil className="h-3 w-3" /> {t("general.edit")}
                </button>
                <button
                  type="button"
                  onClick={(e) => remove(n.id, e)}
                  className="text-xs text-red-600 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> {t("general.delete")}
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-sm text-gray-500">{t("notes.no_notes")}</p>
          )}
        </div>

        {active ? (
          <div className="card flex-1 p-6">
            <div className="mb-4 flex items-center gap-2 text-xs text-[#5D3A8C]">
              <Lock className="h-3 w-3" /> {t("notes.private_encrypted")}
            </div>
            <input
              className="input-field mb-4 text-lg font-semibold"
              placeholder={t("notes.title_placeholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-2 mb-2">
              <EmojiPicker
                onInsert={(emoji) =>
                  setContent((c) =>
                    insertEmojiAtCursor(c, emoji, contentRef.current)
                  )
                }
              />
              <span className="text-xs text-gray-500 self-center">{t("notes.add_emoji")}</span>
            </div>
            <textarea
              ref={contentRef}
              className="input-field min-h-[300px] resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("notes.write_placeholder")}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={save} className="btn-primary">
                {active.id ? t("notes.update_note") : t("notes.save_note")}
              </button>
              <button onClick={() => setActive(null)} className="btn-secondary">
                {t("general.close")}
              </button>
            </div>
          </div>
        ) : (
          <div className="card flex-1 flex items-center justify-center p-12 text-gray-500">
            {t("notes.select_or_create")}
          </div>
        )}
      </div>
    </div>
  );
}
