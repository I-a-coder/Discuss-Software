"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
const CACHE_PREFIX = "yusi_trans_cache_";

type DynamicCache = Record<string, string>;

type LanguageContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
  /** Translate any raw English string (cached + AI fallback) */
  td: (text: string) => string;
  isRtl: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  td: (text) => text,
  isRtl: false,
});

function readStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  return saved && TRANSLATIONS[saved] ? saved : "en";
}

function getCacheKey(lang: LangCode) {
  return `${CACHE_PREFIX}${lang}`;
}

function loadCache(lang: LangCode): DynamicCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: LangCode, cache: DynamicCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCacheKey(lang), JSON.stringify(cache));
  } catch {
    /* storage full – skip */
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [ready, setReady] = useState(false);
  // Dynamic translation cache for the current language
  const [dynCache, setDynCache] = useState<DynamicCache>({});
  // Queue of texts waiting to be translated
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translatingRef = useRef(false);

  useEffect(() => {
    const l = readStoredLang();
    setLangState(l);
    setDynCache(loadCache(l));
    setReady(true);
  }, []);

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang);
    const isRtl = !!meta?.rtl;
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
    
    // Load local cache immediately
    const local = loadCache(lang);
    setDynCache(local);
    pendingRef.current.clear();

    // Fetch the global database cache for this language
    if (lang !== "en") {
      fetch(`/api/translate/cache?lang=${lang}`)
        .then(res => res.json())
        .then(data => {
          if (data.cache) {
            setDynCache(prev => {
              const merged = { ...prev, ...data.cache };
              saveCache(lang, merged);
              return merged;
            });
          }
        })
        .catch(console.error);
    }
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  /** Flush the pending queue to the AI translate API */
  const flushPending = useCallback(async (currentLang: LangCode) => {
    if (translatingRef.current) return;
    const texts = [...pendingRef.current];
    if (!texts.length) return;
    pendingRef.current.clear();
    translatingRef.current = true;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: currentLang, texts }),
      });
      if (!res.ok) return;
      const { translations } = await res.json() as { translations: string[] };
      setDynCache((prev) => {
        const updated = { ...prev };
        texts.forEach((text, i) => {
          if (translations[i] && translations[i] !== text) {
            updated[text] = translations[i];
          }
        });
        saveCache(currentLang, updated);
        return updated;
      });
    } catch {
      /* network error – skip */
    } finally {
      translatingRef.current = false;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const val = translate(lang, key);
      if (lang === "en") return val;

      const englishVal = translate("en", key);
      // If it falls back to the English string, we send it to AI for translation
      if (val === englishVal) {
        if (dynCache[englishVal]) return dynCache[englishVal];

        // Queue for translation
        if (!pendingRef.current.has(englishVal)) {
          pendingRef.current.add(englishVal);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            void flushPending(lang);
          }, 300);
        }
      }
      return val;
    },
    [lang, dynCache, flushPending]
  );

  /**
   * Translate a raw English string dynamically.
   * - Returns cached translation instantly if available.
   * - Queues the string for AI translation if not cached and lang ≠ en.
   */
  const td = useCallback(
    (text: string): string => {
      if (!text || lang === "en") return text;
      if (dynCache[text]) return dynCache[text];
      // Queue for translation
      if (!pendingRef.current.has(text)) {
        pendingRef.current.add(text);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          void flushPending(lang);
        }, 300);
      }
      return text; // return English while waiting
    },
    [lang, dynCache, flushPending]
  );

  const isRtl = !!LANGUAGES.find((l) => l.code === lang)?.rtl;

  if (!ready) {
    return (
      <LanguageContext.Provider
        value={{
          lang: "en",
          setLang,
          t: (key) => translate("en", key),
          td: (text) => text,
          isRtl: false,
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, td, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
