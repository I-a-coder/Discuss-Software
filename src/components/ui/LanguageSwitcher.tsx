"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  /** "up" for bottom sidebar; "down" for top header */
  direction?: "up" | "down";
};

export function LanguageSwitcher({ direction = "up" }: Props) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const menuPos =
    direction === "down"
      ? "absolute top-full left-0 mt-1"
      : "absolute bottom-full left-0 mb-1";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-gray-500 hover:bg-[#F3EEF8] hover:text-[#5D3A8C] transition"
        title={t("lang.change")}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{current.nativeName}</span>
      </button>

      {open && (
        <div className={`${menuPos} w-48 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50`}>
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5D3A8C]">
              {t("lang.header")}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                  lang === l.code
                    ? "bg-[#F3EEF8] text-[#5D3A8C] font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex-1">{l.nativeName}</span>
                <span className="text-xs text-gray-400">{l.label}</span>
                {lang === l.code && <Check className="h-3.5 w-3.5 text-[#5D3A8C] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
