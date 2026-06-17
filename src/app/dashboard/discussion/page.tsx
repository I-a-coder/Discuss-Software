"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { NetworkChat } from "@/components/features/NetworkChat";

export default function DiscussionPage() {
  return (
    <FeatureGuard feature="discussion">
      <NetworkChat />
    </FeatureGuard>
  );
}
