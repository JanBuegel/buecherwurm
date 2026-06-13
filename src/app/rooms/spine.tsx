"use client";

import { readableText, spineColorFor, spineWidthPx } from "@/lib/spine";

export type SpineCopy = {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  pageCount: number | null;
  spineColor: string | null;
};

/** A single rendered book spine (presentational; drag handled by the parent). */
export function Spine({
  copy,
  dragging = false,
}: {
  copy: SpineCopy;
  dragging?: boolean;
}) {
  const color = spineColorFor(copy.id, copy.spineColor);
  const width = spineWidthPx(copy.pageCount);
  const text = readableText(color);

  // Show more text lines as the spine gets wider.
  const lines: { text: string; cls: string }[] = [
    { text: copy.title, cls: "text-[10px] font-semibold" },
  ];
  if (copy.subtitle && width >= 34) {
    lines.push({ text: copy.subtitle, cls: "text-[8px] italic opacity-75" });
  }
  if (copy.author && width >= 22) {
    lines.push({ text: copy.author, cls: "text-[8px] opacity-80" });
  }

  return (
    <div
      title={[copy.title, copy.subtitle, copy.author]
        .filter(Boolean)
        .join(" — ")}
      style={{
        width,
        backgroundColor: color,
        color: text,
        backgroundImage:
          "linear-gradient(90deg, rgba(255,255,255,.30) 0%, rgba(255,255,255,.06) 12%, rgba(0,0,0,.10) 80%, rgba(0,0,0,.38) 100%)",
      }}
      className={`relative flex h-full shrink-0 cursor-grab items-center justify-center gap-px overflow-hidden rounded-t-[3px] border-b-2 border-black/30 shadow-[0_1px_2px_rgba(0,0,0,.4)] ${
        dragging ? "opacity-60" : ""
      }`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-white/20" />
      {lines.map((line, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className={`max-h-[90%] overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] ${line.cls}`}
          style={{
            textShadow:
              text === "#ffffff" ? "0 1px 1px rgba(0,0,0,.45)" : "none",
          }}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}
