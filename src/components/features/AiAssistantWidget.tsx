"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bot, MessageCircle, Sparkles, X } from "lucide-react";
import { AiChatPanel } from "@/components/features/AiChatPanel";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { getVoicePref, setVoicePref } from "@/lib/voice-assistant";

export function AiAssistantWidget() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    setVoiceEnabled(getVoicePref());
  }, []);

  const role = (session?.user?.role || "GUEST") as UserRole;
  const allowed = session?.user && canPerform(role, "useAiChat");

  if (!allowed || pathname === "/dashboard/ai") return null;

  function handleVoiceChange(v: boolean) {
    setVoicePref(v);
    setVoiceEnabled(v);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="ai-chat-widget-panel w-[min(100vw-2rem,400px)] h-[min(72vh,560px)] rounded-2xl border border-[#5D3A8C]/15 bg-white shadow-2xl shadow-[#5D3A8C]/20 overflow-hidden flex flex-col">
          <AiChatPanel
            compact
            voiceEnabled={voiceEnabled}
            onVoiceEnabledChange={handleVoiceChange}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="ai-fab group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7B5AA8] via-[#5D3A8C] to-[#4A2E70] text-white shadow-lg shadow-[#5D3A8C]/40 transition-transform hover:scale-105 active:scale-95"
      >
        <span className="ai-fab-ring absolute inset-0 rounded-full" aria-hidden />
        <span className="ai-fab-ring ai-fab-ring-delay absolute inset-0 rounded-full" aria-hidden />
        {open ? (
          <X className="relative h-6 w-6" />
        ) : (
          <>
            <Bot className="relative h-7 w-7" />
            <Sparkles className="absolute -right-0.5 -top-0.5 h-4 w-4 text-amber-300 drop-shadow" />
            <MessageCircle className="absolute -bottom-1 -left-1 h-4 w-4 text-white/80" />
          </>
        )}
      </button>
    </div>
  );
}
