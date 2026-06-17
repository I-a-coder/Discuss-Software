"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { TeamPanel } from "@/components/features/TeamPanel";

export default function TeamPage() {
  return (
    <FeatureGuard feature="team">
      <TeamPanel />
    </FeatureGuard>
  );
}
