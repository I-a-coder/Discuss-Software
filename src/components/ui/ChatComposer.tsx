"use client";

import { useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, Loader2 } from "lucide-react";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";
import { isImageMime } from "@/lib/upload-client";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (payload: {
    content: string;
    attachmentPath?: string;
    attachmentName?: string;
    attachmentMime?: string;
  }) => Promise<void>;
};

export function ChatComposer({
  placeholder,
  disabled,
  onSend,
}: Props) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("discussion.type_message");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{
    path: string;
    name: string;
    mime: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    setPending({ path: data.path, name: data.name, mime: data.mime });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || uploading) return;
    if (!text.trim() && !pending) return;
    await onSend({
      content: text,
      attachmentPath: pending?.path,
      attachmentName: pending?.name,
      attachmentMime: pending?.mime,
    });
    setText("");
    setPending(null);
  }

  return (
    <form onSubmit={handleSend} className="border-t border-gray-100 p-3 space-y-2">
      {pending && (
        <div className="flex items-center gap-2 rounded-lg bg-[#F3EEF8] px-3 py-2 text-xs text-[#5D3A8C]">
          {isImageMime(pending.mime) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.path}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <Paperclip className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate flex-1">{pending.name}</span>
          <button
            type="button"
            className="text-gray-500 hover:text-red-600"
            onClick={() => setPending(null)}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2 items-center">
        <EmojiPicker
          onInsert={(emoji) =>
            setText((t) => insertEmojiAtCursor(t, emoji, inputRef.current))
          }
        />
        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await uploadFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await uploadFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          title={t("chat.attach_media")}
          disabled={disabled || uploading}
          onClick={() => mediaRef.current?.click()}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#5D3A8C]"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          title={t("chat.attach_file")}
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#5D3A8C]"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          className="input-field flex-1"
          placeholder={resolvedPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="btn-primary px-4"
          disabled={disabled || uploading || (!text.trim() && !pending)}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
