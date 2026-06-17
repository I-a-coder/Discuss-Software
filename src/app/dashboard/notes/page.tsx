"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { PersonalNotes } from "@/components/features/PersonalNotes";

export default function NotesPage() {
  return (
    <FeatureGuard feature="personal_notes">
      <PersonalNotes />
    </FeatureGuard>
  );
}
