"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { AiChatPanel } from "./AiChatPanel";
import { getVoicePref, setVoicePref } from "@/lib/voice-assistant";
import { useLanguage } from "@/contexts/LanguageContext";

export function AiChat() {
  const { t } = useLanguage();
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    setVoiceEnabled(getVoicePref());
  }, []);

  function handleVoiceChange(v: boolean) {
    setVoicePref(v);
    setVoiceEnabled(v);
  }

  return (
    <div>
      <PageHeader
        title={t("ai.title")}
        description={t("ai.desc")}
        help={t("ai.help")}
      />
      <AiChatPanel
        voiceEnabled={voiceEnabled}
        onVoiceEnabledChange={handleVoiceChange}
      />
    </div>
  );
}
