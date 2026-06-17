"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { Feature } from "@/lib/constants";
import type { UserRole } from "@/lib/permissions";
import { tFeature, tRole } from "@/lib/translations";

export function useLabels() {
  const { t, lang, setLang, isRtl } = useLanguage();
  return {
    t,
    lang,
    setLang,
    isRtl,
    feature: (f: Feature) => tFeature(lang, f),
    role: (r: UserRole | string) => tRole(lang, r),
  };
}
