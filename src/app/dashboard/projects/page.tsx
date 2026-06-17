"use client";

import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { ProjectBoard } from "@/components/features/ProjectBoard";

export default function ProjectsPage() {
  return (
    <FeatureGuard feature="project_board">
      <ProjectBoard />
    </FeatureGuard>
  );
}
