/**
 * Picks the colour a cover is "mostly made of" — used to tint the book spine.
 *
 * Runs client-side: the image is drawn small onto a canvas and its pixels are
 * binned into coarse colour buckets. Near-white/near-black pixels (typical
 * backgrounds and text) are skipped unless they are clearly colourful, and
 * saturated pixels are weighted up so an accent colour wins over muddy tones.
 *
 * Returns a `#rrggbb` string, or `null` when the colour can't be read — e.g. a
 * cross-origin image whose host doesn't send CORS headers (tainted canvas).
 */
export function dominantColorFromImage(img: HTMLImageElement): string | null {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // tainted canvas (cross-origin without CORS)
  }

  type Bin = { weight: number; r: number; g: number; b: number };
  const bins = new Map<number, Bin>();
  let fallbackR = 0;
  let fallbackG = 0;
  let fallbackB = 0;
  let fallbackN = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 125) continue; // skip transparent pixels

    fallbackR += r;
    fallbackG += g;
    fallbackB += b;
    fallbackN += 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const nearWhite = min > 232;
    const nearBlack = max < 28;
    if ((nearWhite || nearBlack) && sat < 0.15) continue; // background / text

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const weight = 1 + sat; // favour colourful pixels
    const bin = bins.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    bin.weight += weight;
    bin.r += r * weight;
    bin.g += g * weight;
    bin.b += b * weight;
    bins.set(key, bin);
  }

  let best: Bin | null = null;
  for (const bin of bins.values()) {
    if (!best || bin.weight > best.weight) best = bin;
  }

  if (best) {
    return toHex(best.r / best.weight, best.g / best.weight, best.b / best.weight);
  }
  // Whole image was filtered out (e.g. a pure black-and-white cover).
  if (fallbackN > 0) {
    return toHex(fallbackR / fallbackN, fallbackG / fallbackN, fallbackB / fallbackN);
  }
  return null;
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
