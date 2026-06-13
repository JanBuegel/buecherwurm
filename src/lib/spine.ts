/** Spine width in px derived from page count (thicker book = wider spine). */
export function spineWidthPx(pageCount: number | null): number {
  if (!pageCount) return 64;
  return Math.max(44, Math.min(120, Math.round(pageCount / 6) + 36));
}

const PALETTE = [
  "#7f1d1d",
  "#9a3412",
  "#854d0e",
  "#3f6212",
  "#065f46",
  "#0f766e",
  "#155e75",
  "#1e3a8a",
  "#5b21b6",
  "#831843",
  "#374151",
  "#78350f",
];

/** Stable spine colour: explicit value wins, else derived from a seed. */
export function spineColorFor(seed: string, explicit: string | null): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Picks black or white text for contrast against a hex background. */
export function readableText(hex: string): "#ffffff" | "#111111" {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}
