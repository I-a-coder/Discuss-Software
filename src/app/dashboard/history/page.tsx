"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { ActivityHistory } from "@/components/features/ActivityHistory";

export default function HistoryPage() {
  return (
    <FeatureGuard feature="history">
      <ActivityHistory />
    </FeatureGuard>
  );
}
