"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speakText, stopSpeaking } from "@/lib/voice-assistant";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@/lib/translations";

export type AiMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export function useAiChat(voiceEnabled: boolean) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const { lang } = useLanguage();
  const abortRef = useRef<AbortController | null>(null);

  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? "English";

  const reload = useCallback(() => {
    return fetch("/api/ai")
      .then((r) => r.json())
      .then(setMessages);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopSpeaking();
    setLoading(false);
  }, []);

  const send = useCallback(
    async (msg: string, opts?: { skipSaveUser?: boolean }) => {
      const text = msg.trim();
      if (!text) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      if (!opts?.skipSaveUser) {
        setMessages((m) => [
          ...m,
          {
            id: "tmp-u",
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            lang,
            langLabel,
            regenerate: !!opts?.skipSaveUser,
          }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await res.json();
        setLoading(false);
        if (data.reply) {
          if (voiceEnabled) speakText(data.reply);
        }
        await reload();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setLoading(false);
        }
        if (!opts?.skipSaveUser) {
          setMessages((m) => m.filter((x) => x.id !== "tmp-u"));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [voiceEnabled, reload, lang, langLabel]
  );

  const regenerate = useCallback(
    async (assistantId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return;
      let userMsg: AiMessage | undefined;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMsg = messages[i];
          break;
        }
      }
      if (!userMsg) return;
      stopSpeaking();
      await fetch(`/api/ai/${assistantId}`, { method: "DELETE" });
      setMessages((m) => m.filter((x) => x.id !== assistantId));
      await send(userMsg.content, { skipSaveUser: true });
    },
    [messages, send]
  );

  const setMessageFeedback = useCallback((id: string, value: "up" | "down") => {
    setFeedback((prev) => {
      if (prev[id] === value) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: value };
    });
  }, []);

  const deleteMessage = useCallback(
    async (id: string) => {
      if (id.startsWith("tmp-") || id.startsWith("u-") || id.startsWith("a-")) {
        setMessages((m) => m.filter((x) => x.id !== id));
        return;
      }
      await fetch(`/api/ai/${id}`, { method: "DELETE" });
      await reload();
    },
    [reload]
  );

  const editMessage = useCallback(
    async (id: string, content: string) => {
      const text = content.trim();
      if (!text) return;
      if (id.startsWith("tmp-") || id.startsWith("u-") || id.startsWith("a-")) {
        setMessages((m) =>
          m.map((x) => (x.id === id ? { ...x, content: text } : x))
        );
        return;
      }
      await fetch(`/api/ai/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      await reload();
    },
    [reload]
  );

  const clearHistory = useCallback(async () => {
    stopSpeaking();
    await fetch("/api/ai", { method: "DELETE" });
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    feedback,
    send,
    reload,
    stop,
    regenerate,
    setMessageFeedback,
    deleteMessage,
    editMessage,
    clearHistory,
  };
}
