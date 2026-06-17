"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { AiChat } from "@/components/features/AiChat";

export default function AiPage() {
  return (
    <FeatureGuard feature="ai_chat">
      <AiChat />
    </FeatureGuard>
  );
}
