"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isChunk =
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("ChunkLoadError");

  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h2 className="text-xl font-bold text-gray-900">
        {isChunk ? t("error.page_failed") : t("error.something_wrong")}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {isChunk ? t("error.chunk_desc") : error.message}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">
          {t("error.try_again")}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-secondary"
        >
          {t("error.full_refresh")}
        </button>
      </div>
    </div>
  );
}
