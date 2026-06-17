"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { CalendarPanel } from "@/components/features/CalendarPanel";

export default function CalendarPage() {
  return (
    <FeatureGuard feature="calendar">
      <CalendarPanel />
    </FeatureGuard>
  );
}
