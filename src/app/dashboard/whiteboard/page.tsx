"use client";

import dynamic from "next/dynamic";
import { FeatureGuard } from "@/components/auth/FeatureGuard";

const WhiteboardCanvas = dynamic(
  () =>
    import("@/components/features/WhiteboardCanvas").then((m) => ({
      default: m.WhiteboardCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-gray-500">Loading whiteboard…</p>
    ),
  }
);

export default function WhiteboardPage() {
  return (
    <FeatureGuard feature="whiteboard">
      <WhiteboardCanvas />
    </FeatureGuard>
  );
}
