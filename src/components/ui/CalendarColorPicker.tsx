"use client";

const PRESETS = [
  "#FEF3C7",
  "#FDE68A",
  "#FECACA",
  "#FBCFE8",
  "#E9D5FF",
  "#DDD6FE",
  "#BFDBFE",
  "#A7F3D0",
  "#BBF7D0",
  "#F3EEF8",
  "#E5E7EB",
  "#FFFFFF",
];

type Props = { color: string; onChange: (c: string) => void };

/** Compact scrollable palette for calendar modals */
export function CalendarColorPicker({ color, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={`h-8 w-full rounded-lg border-2 transition hover:scale-105 ${
              color === c ? "border-[#5D3A8C] ring-2 ring-[#5D3A8C]/30" : "border-gray-200"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="input-field flex-1 font-mono text-xs py-2"
        />
      </div>
    </div>
  );
}
