"use client";

import { LanguageSwitcher } from "./LanguageSwitcher";

export function PublicLanguageSwitcher() {
  return (
    <div className="fixed top-4 right-4 z-50 rounded-xl border border-gray-200 bg-white px-1 shadow-sm">
      <LanguageSwitcher direction="down" />
    </div>
  );
}
