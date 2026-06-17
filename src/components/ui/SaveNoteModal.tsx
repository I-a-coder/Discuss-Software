"use client";

import { CheckCircle, StickyNote, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function SaveNoteModal({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-note-title"
    >
      <div className="save-note-modal relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 hidden"
          aria-label={t("general.close")}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3EEF8]">
          <CheckCircle className="h-9 w-9 text-[#5D3A8C]" />
        </div>
        <h3 id="save-note-title" className="text-lg font-semibold text-gray-900">
          {t("modal.note_saved")}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          <StickyNote className="inline h-4 w-4 mr-1 text-[#5D3A8C]" />
          {t("modal.saved_to_notes")}
        </p>
        {title && (
          <p className="mt-3 rounded-xl bg-[#F3EEF8] px-3 py-2 text-sm font-medium text-[#5D3A8C] truncate">
            {title}
          </p>
        )}
        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
          {t("modal.got_it")}
        </button>
      </div>
    </div>
  );
}
