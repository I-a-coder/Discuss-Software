"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";

const EMOJI_GROUPS = [
  ["😀", "😊", "😂", "🥰", "😎", "🤔", "👍", "👏", "🙌", "💪"],
  ["❤️", "🔥", "⭐", "✅", "❌", "⚠️", "💡", "📌", "🎯", "🚀"],
  ["📅", "📝", "💬", "📢", "🎉", "☕", "👋", "🙏", "😅", "🤝"],
  ["💜", "✨", "📎", "🔗", "⏰", "✏️", "📊", "🏆", "🔒", "💯"],
];

const PANEL_W = 272;
const PANEL_H = 200;

type EmojiPickerProps = {
  onInsert: (emoji: string) => void;
  className?: string;
};

export function EmojiPicker({ onInsert, className = "" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    function place() {
      const rect = ref.current!.getBoundingClientRect();
      const pad = 8;
      let left = rect.left;
      let top = rect.top - PANEL_H - pad;
      if (left + PANEL_W > window.innerWidth - pad) {
        left = window.innerWidth - PANEL_W - pad;
      }
      if (left < pad) left = pad;
      if (top < pad) {
        top = rect.bottom + pad;
      }
      setCoords({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      const panel = document.getElementById("emoji-picker-portal");
      if (panel?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const panel =
    open && mounted ? (
      <div
        id="emoji-picker-portal"
        className="fixed z-[9999] w-[272px] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
        style={{ top: coords.top, left: coords.left }}
        role="dialog"
        aria-label="Emoji picker"
      >
        {EMOJI_GROUPS.map((group, gi) => (
          <div key={gi} className="mb-2 flex flex-wrap gap-1 last:mb-0">
            {group.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onInsert(emoji);
                  setOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-[#F3EEF8]"
              >
                {emoji}
              </button>
            ))}
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-[#5D3A8C] hover:bg-[#F3EEF8] hover:text-[#5D3A8C]"
        title="Add emoji"
        aria-label="Add emoji"
      >
        <Smile className="h-5 w-5" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export function insertEmojiAtCursor(
  value: string,
  emoji: string,
  element: HTMLInputElement | HTMLTextAreaElement | null
): string {
  if (!element) return value + emoji;
  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  requestAnimationFrame(() => {
    const pos = start + emoji.length;
    element.setSelectionRange(pos, pos);
    element.focus();
  });
  return next;
}
