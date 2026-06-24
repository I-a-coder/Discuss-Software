// This file is a stub. The app uses its own i18n system via LanguageContext + translations.ts.
// next-intl is not installed; this placeholder prevents build errors if Next.js discovers the file.

import { notFound } from "next/navigation";

const locales = ["en", "es", "fr", "de", "zh", "ja", "ar", "hi", "pt", "ru", "it"] as const;
type Locale = (typeof locales)[number];

export function validateLocale(locale: string): asserts locale is Locale {
  if (!(locales as readonly string[]).includes(locale)) notFound();
}
