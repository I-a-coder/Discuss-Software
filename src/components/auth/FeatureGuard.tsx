"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { canAccess, type UserRole } from "@/lib/permissions";
import type { Feature } from "@/lib/constants";
import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function FeatureGuard({
  feature,
  children,
}: {
  feature: Feature;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const role = (session?.user?.role || "GUEST") as UserRole;

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5D3A8C] border-t-transparent" />
      </div>
    );
  }

  if (!canAccess(role, feature)) {
    return (
      <div className="card flex flex-col items-center justify-center p-12 text-center">
        <Lock className="mb-4 h-12 w-12 text-[#5D3A8C]" />
        <h2 className="brand-heading text-xl text-gray-900">{t("guard.restricted")}</h2>
        <p className="mt-2 max-w-md text-sm text-gray-600">
          {t("guard.no_permission")}
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          {t("guard.back_home")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
