"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  LANGUAGES,
  TRANSLATIONS,
  t as translate,
  type LangCode,
  type TranslationKey,
} from "@/lib/translations";

const STORAGE_KEY = "yusi_lang";

type LanguageContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
  isRtl: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  isRtl: false,
});

function readStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  return saved && TRANSLATIONS[saved] ? saved : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(readStoredLang());
    setReady(true);
  }, []);

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang);
    const isRtl = !!meta?.rtl;
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translate(lang, key),
    [lang]
  );

  const isRtl = !!LANGUAGES.find((l) => l.code === lang)?.rtl;

  // Avoid hydration mismatch: render children only after client lang is loaded
  if (!ready) {
    return (
      <LanguageContext.Provider
        value={{
          lang: "en",
          setLang,
          t: (key) => translate("en", key),
          isRtl: false,
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
