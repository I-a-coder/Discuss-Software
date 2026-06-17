"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { MeetingHub } from "@/components/features/MeetingHub";

export default function MeetingsPage() {
  return (
    <FeatureGuard feature="meeting_notes">
      <MeetingHub />
    </FeatureGuard>
  );
}
