/** Lightweight person mask for virtual backgrounds (no ML deps). */

function isSkin(r: number, g: number, b: number): boolean {
  if (r < 60 || g < 40 || b < 20) return false;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx - mn < 15) return false;
  return r > g && r > b && r - g > 10;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function isLikelyBackground(r: number, g: number, b: number, x: number, y: number, w: number, h: number): boolean {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  const edge =
    x < w * 0.12 || x > w * 0.88 || y < h * 0.08 || y > h * 0.92;
  return edge && sat < 0.18 && mx > 90;
}

export function updatePersonMask(
  maskCanvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  outW: number,
  outH: number
): void {
  const segW = 200;
  const segH = Math.max(120, Math.round(segW * (outH / outW)));

  const sample = document.createElement("canvas");
  sample.width = segW;
  sample.height = segH;
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  if (!sctx) return;

  sctx.drawImage(video, 0, 0, segW, segH);
  const img = sctx.getImageData(0, 0, segW, segH);
  const d = img.data;
  const cx = segW * 0.5;
  const cy = segH * 0.38;

  for (let y = 0; y < segH; y++) {
    for (let x = 0; x < segW; x++) {
      const i = (y * segW + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const ex = (x - cx) / (segW * 0.5);
      const ey = (y - cy) / (segH * 0.58);
      const dist = Math.sqrt(ex * ex + ey * ey);
      const centerWeight = 1 - smoothStep(0.68, 1.1, dist);

      const skin = isSkin(r, g, b) ? 1 : 0;
      const bg = isLikelyBackground(r, g, b, x, y, segW, segH) ? 1 : 0;
      // Favor a stable soft matte to avoid face/body distortion.
      const fg = centerWeight * 0.9 + skin * 0.22 - bg * 0.15;
      const alpha = Math.min(255, Math.max(0, Math.round(fg * 255)));

      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = alpha;
    }
  }

  sctx.putImageData(img, 0, 0);

  maskCanvas.width = outW;
  maskCanvas.height = outH;
  const mctx = maskCanvas.getContext("2d");
  if (!mctx) return;
  mctx.clearRect(0, 0, outW, outH);
  mctx.filter = "blur(3px)";
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = "high";
  mctx.drawImage(sample, 0, 0, segW, segH, 0, 0, outW, outH);
  mctx.filter = "none";
}

export function drawSegmentedPerson(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  maskCanvas: HTMLCanvasElement
): void {
  updatePersonMask(maskCanvas, video, w, h);

  const person = document.createElement("canvas");
  person.width = w;
  person.height = h;
  const pctx = person.getContext("2d");
  if (!pctx) return;

  pctx.drawImage(video, 0, 0, w, h);
  pctx.globalCompositeOperation = "destination-in";
  pctx.drawImage(maskCanvas, 0, 0, w, h);
  pctx.globalCompositeOperation = "source-over";

  ctx.drawImage(person, 0, 0, w, h);
}

export function drawBlurredVideoBackground(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  blurPx: number
): void {
  ctx.save();
  ctx.filter = `blur(${blurPx}px) brightness(1.02)`;
  ctx.drawImage(video, -w * 0.04, -h * 0.04, w * 1.08, h * 1.08);
  ctx.filter = "none";
  ctx.restore();
}
