"use client";

import { type CSSProperties, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setCopyReadAction } from "../actions";

const CONFETTI_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#eab308",
  "#06b6d4",
];

type Piece = { id: number; style: CSSProperties };

export function ReadToggle({
  copyId,
  initiallyRead,
  readLabel,
  canEdit,
}: {
  copyId: string;
  initiallyRead: boolean;
  readLabel: string | null;
  canEdit: boolean;
}) {
  const [read, setRead] = useState(initiallyRead);
  const [label, setLabel] = useState(readLabel);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [, start] = useTransition();

  function burst() {
    const next: Piece[] = Array.from({ length: 40 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 160;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 90; // gravity bias
      return {
        id: i,
        style: {
          width: `${6 + Math.round(Math.random() * 5)}px`,
          height: `${8 + Math.round(Math.random() * 6)}px`,
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          borderRadius: "1px",
          animationDuration: `${700 + Math.random() * 700}ms`,
          animationDelay: `${Math.random() * 120}ms`,
          // custom props consumed by the bw-confetti keyframes
          "--dx": `${dx.toFixed(0)}px`,
          "--dy": `${dy.toFixed(0)}px`,
          "--rot": `${(Math.random() * 960 - 480).toFixed(0)}deg`,
        } as CSSProperties,
      };
    });
    setPieces(next);
    setTimeout(() => setPieces([]), 1700);
  }

  function mark(value: boolean) {
    setRead(value);
    setLabel(value ? "gerade eben" : null);
    if (value) burst();
    start(() => setCopyReadAction(copyId, value));
  }

  return (
    <div className="relative inline-flex flex-col items-start gap-1">
      {/* confetti overlay (positioned over the control) */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {pieces.map((p) => (
          <span key={p.id} className="bw-confetti-piece" style={p.style} />
        ))}
      </div>

      {read ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            ✅ Gelesen{label ? ` · ${label}` : ""}
          </span>
          {canEdit ? (
            <button
              type="button"
              onClick={() => mark(false)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              rückgängig
            </button>
          ) : null}
        </div>
      ) : canEdit ? (
        <Button
          type="button"
          onClick={() => mark(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          📖 Als gelesen markieren
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Noch nicht gelesen</span>
      )}
    </div>
  );
}
