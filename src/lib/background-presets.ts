/** Procedural backgrounds for virtual camera (no external images required) */

import { drawBlurredVideoBackground, drawSegmentedPerson } from "@/lib/person-mask";

export type BgPresetId =
  | "none"
  | "blur"
  | "remove"
  | "filter-purple"
  | "filter-warm"
  | "bg-office"
  | "bg-scenic"
  | "bg-workspace"
  | "bg-library"
  | "bg-custom";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: BgPresetId
) {
  switch (preset) {
    case "bg-office":
      drawOfficeBg(ctx, w, h);
      break;
    case "bg-scenic":
      drawScenicBg(ctx, w, h);
      break;
    case "bg-workspace":
      drawWorkspaceBg(ctx, w, h);
      break;
    case "bg-library":
      drawLibraryBg(ctx, w, h);
      break;
    default:
      break;
  }
}

function drawOfficeBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#e8e4df");
  g.addColorStop(0.4, "#d4cfc7");
  g.addColorStop(1, "#b8b0a6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect((w / 6) * i, h * 0.7, w / 6 - 4, h * 0.3);
  }
  ctx.fillStyle = "rgba(93, 58, 140, 0.08)";
  ctx.fillRect(0, 0, w, h * 0.25);
}

function drawScenicBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(0.45, "#B8E0F6");
  sky.addColorStop(0.55, "#90EE90");
  sky.addColorStop(1, "#228B22");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#2d5a27";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.55);
  ctx.lineTo(w * 0.3, h * 0.35);
  ctx.lineTo(w * 0.55, h * 0.5);
  ctx.lineTo(w, h * 0.4);
  ctx.lineTo(w, h);
  ctx.fill();
}

function drawWorkspaceBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  ctx.fillStyle = "rgba(93, 58, 140, 0.4)";
  ctx.fillRect(w * 0.05, h * 0.15, w * 0.5, h * 0.35);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < 8; i++) {
    ctx.strokeRect(w * 0.1 + i * 12, h * 0.2, 80, 50);
  }
}

function drawLibraryBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#3d2914");
  g.addColorStop(0.5, "#5c4033");
  g.addColorStop(1, "#3d2914");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      const hue = (row * 10 + col) % 360;
      ctx.fillStyle = `hsla(${hue}, 40%, 35%, 0.5)`;
      ctx.fillRect(col * (w / 10) + 2, row * (h / 5) + 2, w / 10 - 4, h / 5 - 4);
    }
  }
}

const IMAGE_BACKGROUNDS: BgPresetId[] = [
  "bg-office",
  "bg-scenic",
  "bg-workspace",
  "bg-library",
];

export function isImageBackground(preset: BgPresetId): boolean {
  return IMAGE_BACKGROUNDS.includes(preset);
}

/** Zoom-style: replace area behind the person, keep person sharp at full frame size. */
export function renderVirtualFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  preset: BgPresetId,
  maskCanvas: HTMLCanvasElement,
  customBackgroundImage?: CanvasImageSource | null
): void {
  if (preset === "none") {
    ctx.drawImage(video, 0, 0, w, h);
    return;
  }

  if (preset === "bg-custom" && customBackgroundImage) {
    // Cover full frame like Zoom backgrounds (no contain zoom-out effect).
    const sourceW =
      (customBackgroundImage as { width?: number }).width ||
      (customBackgroundImage as { videoWidth?: number }).videoWidth ||
      w;
    const sourceH =
      (customBackgroundImage as { height?: number }).height ||
      (customBackgroundImage as { videoHeight?: number }).videoHeight ||
      h;
    const scale = Math.max(w / sourceW, h / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const dx = (w - drawW) / 2;
    const dy = (h - drawH) / 2;
    ctx.drawImage(customBackgroundImage, dx, dy, drawW, drawH);
    drawSegmentedPerson(ctx, video, w, h, maskCanvas);
    return;
  }

  if (isImageBackground(preset)) {
    drawBackground(ctx, w, h, preset);
    drawSegmentedPerson(ctx, video, w, h, maskCanvas);
    return;
  }

  if (preset === "remove") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#f0eef5");
    g.addColorStop(1, "#e2dce8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawSegmentedPerson(ctx, video, w, h, maskCanvas);
    return;
  }

  if (preset === "blur") {
    drawBlurredVideoBackground(ctx, video, w, h, 36);
    drawSegmentedPerson(ctx, video, w, h, maskCanvas);
    return;
  }

  if (preset === "filter-purple" || preset === "filter-warm") {
    drawBlurredVideoBackground(ctx, video, w, h, 18);
    ctx.fillStyle =
      preset === "filter-purple"
        ? "rgba(93, 58, 140, 0.38)"
        : "rgba(217, 119, 6, 0.28)";
    ctx.fillRect(0, 0, w, h);
    drawSegmentedPerson(ctx, video, w, h, maskCanvas);
    return;
  }

  ctx.drawImage(video, 0, 0, w, h);
}

/** @deprecated Use renderVirtualFrame — kept for any legacy imports */
export function drawPersonOnBackground(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  mode: "blur" | "remove" | "contain" | "filter-purple" | "filter-warm",
  maskCanvas: HTMLCanvasElement
) {
  const preset: BgPresetId =
    mode === "contain"
      ? "bg-office"
      : mode === "blur"
        ? "blur"
        : mode === "remove"
          ? "remove"
          : mode;
  renderVirtualFrame(ctx, video, w, h, preset, maskCanvas);
}
