"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { MeetingReviewPanel } from "@/components/features/MeetingReviewPanel";

export default function MeetingReviewPage() {
  return (
    <FeatureGuard feature="meeting_notes">
      <MeetingReviewPanel />
    </FeatureGuard>
  );
}
