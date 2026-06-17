"use client";

import { Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

function LoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center">
      {t("general.loading_page")}
    </div>
  );
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}