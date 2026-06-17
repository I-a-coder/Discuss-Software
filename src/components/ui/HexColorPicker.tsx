"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Pipette, X } from "lucide-react";

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function buildHexCells(): { q: number; r: number; color: string }[] {
  const cells: { q: number; r: number; color: string }[] = [];
  const radius = 8;

  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const dist = (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
      if (dist > radius) continue;

      if (dist === 0) {
        cells.push({ q, r, color: "#FFFFFF" });
        continue;
      }

      const angle = (Math.atan2(r, q) * 180) / Math.PI;
      const hue = (angle + 180 + dist * 8) % 360;
      const sat = Math.min(98, 42 + dist * 7);
      const light = Math.max(18, Math.min(88, 72 - dist * 6));
      cells.push({ q, r, color: hslToHex(hue, sat, light) });
    }
  }
  return cells;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

type HexColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
};

export function HexColorPicker({ color, onChange }: HexColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [shadeHue, setShadeHue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => buildHexCells(), []);

  const shadeStrip = useMemo(() => {
    const steps = 24;
    return Array.from({ length: steps }, (_, i) => {
      const l = 95 - (i / (steps - 1)) * 80;
      return hslToHex(shadeHue, 85, l);
    });
  }, [shadeHue]);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(c: string) {
    onChange(c);
    setHexInput(c);
    const { r, g, b } = hexToRgb(c);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const d = max - min;
    if (d > 0.05 && max > 0) {
      let h = 0;
      if (max === r / 255) h = ((g - b) / 255 / d) % 6;
      else if (max === g / 255) h = (b - r) / 255 / d + 2;
      else h = (r - g) / 255 / d + 4;
      setShadeHue(Math.round(h * 60) % 360);
    }
  }

  function applyHexInput() {
    const v = hexInput.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) pick(v);
    else if (/^[0-9A-Fa-f]{6}$/.test(v)) pick(`#${v}`);
  }

  const hexSize = 18;
  const hexW = hexSize * 1.15;
  const hexH = hexSize * 1.3;
  const gridRadius = 8;
  const gridPoints = cells.map(({ q, r }) => {
    const x = hexW * (q * 0.75 + r * 0.75);
    const y = hexH * (q * 0.433 + r * -0.433);
    return { q, r, x, y };
  });
  const minX = Math.min(...gridPoints.map((p) => p.x));
  const minY = Math.min(...gridPoints.map((p) => p.y));
  const maxX = Math.max(...gridPoints.map((p) => p.x));
  const maxY = Math.max(...gridPoints.map((p) => p.y));
  const gridPadding = 16;
  const gridWidth = maxX - minX + hexW + gridPadding * 2;
  const gridHeight = maxY - minY + hexH + gridPadding * 2;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-sm hover:border-[#5D3A8C]"
        title="Open color picker"
      >
        <span
          className="h-8 w-8 rounded-lg border border-gray-300 shadow-inner"
          style={{ backgroundColor: color }}
        />
        <span className="hidden text-xs font-medium text-gray-600 sm:inline">
          Color
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed left-1/2 top-1/2 z-[101] flex max-h-[88vh] w-[min(380px,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-[#5D3A8C]">Pick a color</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close color picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-5">
                <div
                  className="relative mx-auto shrink-0"
                  style={{
                    width: gridWidth,
                    height: gridHeight,
                  }}
                >
                  {cells.map(({ q, r, color: c }) => {
                    const xRaw = hexW * (q * 0.75 + r * 0.75);
                    const yRaw = hexH * (q * 0.433 + r * -0.433);
                    const x = xRaw - minX + gridPadding;
                    const y = yRaw - minY + gridPadding;
                    return (
                      <button
                        key={`${q}-${r}`}
                        type="button"
                        onClick={() => pick(c)}
                        title={c}
                        className={`absolute transition hover:scale-110 hover:z-10 ${
                          color.toLowerCase() === c.toLowerCase()
                            ? "ring-2 ring-[#5D3A8C] ring-offset-1"
                            : ""
                        }`}
                        style={{
                          left: x,
                          top: y,
                          width: hexW,
                          height: hexH,
                          backgroundColor: c,
                          clipPath:
                            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        }}
                      />
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => pick("#000000")}
                      title="Black"
                      className="h-10 w-10 rounded-full border-2 border-gray-300 bg-black shadow hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => pick("#FFFFFF")}
                      title="White"
                      className="h-10 w-10 rounded-full border-2 border-gray-300 bg-white shadow hover:scale-105"
                    />
                  </div>
                  <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200">
                    {shadeStrip.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pick(c)}
                        className="h-3 w-10 shrink-0 transition hover:scale-105"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => pick(e.target.value)}
                    className="h-10 w-full max-w-[120px] cursor-pointer rounded-lg border border-gray-200"
                    title="System color picker"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <Pipette className="h-4 w-4 shrink-0 text-[#5D3A8C]" />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onBlur={applyHexInput}
                  onKeyDown={(e) => e.key === "Enter" && applyHexInput()}
                  className="input-field flex-1 font-mono text-xs py-1.5"
                  placeholder="#5D3A8C"
                />
                <span
                  className="h-8 w-8 shrink-0 rounded-lg border border-gray-200"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
