import { Suspense } from "react";
import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { SettingsPanel } from "@/components/features/SettingsPanel";

export default function SettingsPage() {
  return (
    <FeatureGuard feature="settings">
      <Suspense>
        <SettingsPanel />
      </Suspense>
    </FeatureGuard>
  );
}
