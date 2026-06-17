import { HelpCircle } from "lucide-react";

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help text-gray-400">
      <HelpCircle className="h-4 w-4" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
        {text}
      </span>
    </span>
  );
}
