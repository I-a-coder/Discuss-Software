"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Sparkles,
  Volume2,
  VolumeX,
  VolumeOff,
  Pencil,
  Trash2,
  Square,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Eraser,
} from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";
import { AiChatComposer } from "@/components/ui/AiChatComposer";
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  setVoicePref,
  speakText,
  stopSpeaking,
} from "@/lib/voice-assistant";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  compact?: boolean;
  voiceEnabled: boolean;
  onVoiceEnabledChange: (v: boolean) => void;
  onClose?: () => void;
};

export function AiChatPanel({
  compact,
  voiceEnabled,
  onVoiceEnabledChange,
  onClose,
}: Props) {
  const {
    messages,
    loading,
    feedback,
    send,
    stop,
    regenerate,
    setMessageFeedback,
    deleteMessage,
    editMessage,
    clearHistory,
  } = useAiChat(voiceEnabled);
  const { t, lang } = useLanguage();
  const endRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleVoice() {
    const next = !voiceEnabled;
    if (!next) stopSpeaking();
    setVoicePref(next);
    onVoiceEnabledChange(next);
  }

  async function copyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* skip */
    }
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    await clearHistory();
  }

  const voiceSupported =
    isSpeechRecognitionSupported() || isSpeechSynthesisSupported();

  const SUGGESTIONS: string[] = {
    en: ["Summarize our last meeting", "Help me break this into tasks", "Draft a welcome message for the team"],
    es: ["Resume nuestra última reunión", "Ayúdame a dividir esto en tareas", "Redacta un mensaje de bienvenida"],
    fr: ["Résumez notre dernière réunion", "Aidez-moi à diviser ceci en tâches", "Rédigez un message de bienvenue"],
    de: ["Fasse unser letztes Meeting zusammen", "Hilf mir, das in Aufgaben aufzuteilen", "Verfasse eine Willkommensnachricht"],
    ar: ["لخص اجتماعنا الأخير", "ساعدني في تقسيم هذا إلى مهام", "اكتب رسالة ترحيب للفريق"],
    zh: ["总结我们上次的会议", "帮我把这个分解成任务", "为团队起草一条欢迎信息"],
    ja: ["前回のミーティングをまとめてください", "これをタスクに分解してください", "チームへのウェルカムメッセージを作成してください"],
    pt: ["Resuma nossa última reunião", "Ajude-me a dividir isso em tarefas", "Rascunhe uma mensagem de boas-vindas"],
    hi: ["हमारी आखिरी बैठक का सारांश दें", "इसे कार्यों में बाँटने में मेरी सहायता करें", "टीम के लिए स्वागत संदेश लिखें"],
    ur: ["ہماری آخری میٹنگ کا خلاصہ کریں", "اس کو کاموں میں تقسیم کرنے میں مدد کریں", "ٹیم کے لیے خیرمقدم پیغام لکھیں"],
  }[lang] ?? ["Summarize our last meeting", "Help me break this into tasks", "Draft a welcome message"];

  return (
    <div
      className={`flex flex-col bg-white ${
        compact ? "h-full" : "card h-[calc(100vh-220px)] min-h-[450px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B5AA8] to-[#5D3A8C] text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {t("ai.title")}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {voiceEnabled ? t("ai.voice_on") : t("ai.text_chat")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Stop AI response (while generating) */}
          {loading && (
            <button
              type="button"
              onClick={stop}
              title={t("ai.stop")}
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              {t("ai.stop")}
            </button>
          )}

          {/* Stop Voice / interrupt TTS (persistent when voice is on) */}
          {voiceSupported && voiceEnabled && !loading && (
            <button
              type="button"
              onClick={stopSpeaking}
              title="Stop speaking"
              className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
            >
              <VolumeOff className="h-3.5 w-3.5" />
              Stop
            </button>
          )}

          {/* Toggle voice on/off */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceEnabled ? t("ai.disable_voice") : t("ai.enable_voice")}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                voiceEnabled
                  ? "bg-[#5D3A8C] text-white hover:bg-[#4A2E70]"
                  : "bg-gray-100 text-gray-600 hover:bg-[#F3EEF8] hover:text-[#5D3A8C]"
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {t("ai.voice")}
            </button>
          )}

          {/* Clear history */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title={confirmClear ? "Click again to confirm clear" : "Clear chat history"}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                confirmClear
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <Eraser className="h-3.5 w-3.5" />
              {confirmClear ? "Confirm?" : "Clear"}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="mx-auto h-10 w-10 text-[#5D3A8C]" />
            <p className="mt-3 text-sm text-gray-600">{t("ai.placeholder")}</p>
            {voiceEnabled && voiceSupported && (
              <p className="mt-1 text-xs text-[#5D3A8C]">{t("ai.voice_hint")}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-[#5D3A8C]/30 bg-[#F3EEF8] px-3 py-1.5 text-xs text-[#5D3A8C] hover:bg-[#5D3A8C] hover:text-white transition"
                >
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex items-end gap-1 max-w-[85%]">
              <div className="flex flex-col gap-1">
                {editingId === m.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="input-field text-sm min-h-[80px]"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        className="text-xs text-gray-500"
                        onClick={() => setEditingId(null)}
                      >
                        {t("general.cancel")}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[#5D3A8C] font-medium"
                        onClick={async () => {
                          await editMessage(m.id, editDraft);
                          setEditingId(null);
                        }}
                      >
                        {t("general.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#5D3A8C] text-white"
                        : "bg-[#F3EEF8] text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                {editingId !== m.id && (
                  <div
                    className={`flex flex-wrap gap-0.5 opacity-70 group-hover:opacity-100 transition ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <>
                        <ActionBtn
                          title={copiedId === m.id ? t("ai.copied") : t("ai.copy")}
                          onClick={() => copyMessage(m.id, m.content)}
                          active={copiedId === m.id}
                        >
                          {copiedId === m.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </ActionBtn>
                        {voiceEnabled && (
                          <ActionBtn
                            title={t("ai.listen_again")}
                            onClick={() => speakText(m.content)}
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </ActionBtn>
                        )}
                        <ActionBtn
                          title={t("ai.like")}
                          onClick={() => setMessageFeedback(m.id, "up")}
                          active={feedback[m.id] === "up"}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title={t("ai.unlike")}
                          onClick={() => setMessageFeedback(m.id, "down")}
                          active={feedback[m.id] === "down"}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title={t("ai.regenerate")}
                          onClick={() => regenerate(m.id)}
                          disabled={loading}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </>
                    )}
                    {m.role === "user" && (
                      <ActionBtn
                        title={t("ai.edit")}
                        onClick={() => {
                          setEditingId(m.id);
                          setEditDraft(m.content);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </ActionBtn>
                    )}
                    <ActionBtn
                      title={t("ai.delete")}
                      onClick={() => deleteMessage(m.id)}
                      danger
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionBtn>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-gray-500 animate-pulse">{t("ai.thinking")}</p>
        )}
        <div ref={endRef} />
      </div>

      <AiChatComposer
        disabled={loading}
        voiceEnabled={voiceEnabled}
        onSend={send}
        onStop={stop}
        isLoading={loading}
        placeholder={t("ai.placeholder")}
      />
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  active,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition disabled:opacity-40 ${
        active
          ? "bg-[#F3EEF8] text-[#5D3A8C]"
          : danger
            ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
            : "text-gray-400 hover:text-[#5D3A8C] hover:bg-[#F3EEF8]"
      }`}
    >
      {children}
    </button>
  );
}
