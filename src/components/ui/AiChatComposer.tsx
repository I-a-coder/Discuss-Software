"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, Square } from "lucide-react";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from "@/lib/voice-assistant";

type Props = {
  placeholder?: string;
  disabled?: boolean;
  voiceEnabled: boolean;
  isLoading?: boolean;
  onSend: (text: string) => Promise<void>;
  onStop?: () => void;
};

export function AiChatComposer({
  placeholder = "Ask the AI assistant…",
  disabled,
  voiceEnabled,
  isLoading,
  onSend,
  onStop,
}: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }

  function toggleMic() {
    if (!voiceEnabled || !isSpeechRecognitionSupported()) return;
    if (listening) {
      stopListening();
      return;
    }

    const rec = createSpeechRecognition();
    if (!rec) return;
    recognitionRef.current = rec;

    rec.onstart = () => {
      setListening(true);
      setInterim("");
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else partial += chunk;
      }
      if (partial) setInterim(partial);
      if (finalText.trim()) {
        setText((t) => (t ? `${t} ${finalText.trim()}` : finalText.trim()));
        setInterim("");
      }
    };

    rec.onerror = () => stopListening();
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    rec.start();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    const msg = text.trim();
    if (!msg) return;
    stopListening();
    await onSend(msg);
    setText("");
    setInterim("");
  }

  const micSupported = isSpeechRecognitionSupported();
  const displayValue = listening && interim ? `${text} ${interim}`.trim() : text;

  return (
    <form onSubmit={handleSend} className="border-t border-gray-100 p-3 space-y-2">
      {listening && (
        <p className="flex items-center gap-2 text-xs text-[#5D3A8C] animate-pulse">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Listening… speak your prompt
        </p>
      )}
      <div className="flex gap-2 items-center">
        {voiceEnabled && micSupported && !isLoading && (
          <button
            type="button"
            title={listening ? "Stop listening" : "Voice prompt"}
            disabled={disabled}
            onClick={toggleMic}
            className={`rounded-xl p-2.5 transition ${
              listening
                ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                : "text-[#5D3A8C] hover:bg-[#F3EEF8]"
            }`}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        {isLoading && onStop && (
          <button
            type="button"
            title="Stop"
            onClick={onStop}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
          >
            <Square className="h-5 w-5 fill-current" />
          </button>
        )}
        <input
          ref={inputRef}
          className="input-field flex-1"
          placeholder={
            voiceEnabled && micSupported
              ? "Type or tap mic to speak…"
              : placeholder
          }
          value={displayValue}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || listening}
        />
        <button
          type="submit"
          className="btn-primary px-4"
          disabled={disabled || !text.trim()}
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
