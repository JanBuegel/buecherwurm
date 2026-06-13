"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Controls = { stop: () => void };

export function BarcodeScanner({
  onDetect,
}: {
  onDetect: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        if (cancelled || !videoRef.current) return;

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (result) {
              onDetectRef.current(result.getText());
              controlsRef.current?.stop();
              controlsRef.current = null;
              setOpen(false);
            }
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch {
        setError(
          "Kamera nicht verfügbar. Zugriff erlauben und HTTPS verwenden (auf dem Handy).",
        );
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        📷 Scannen
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
          <p className="text-sm text-white/80">
            EAN-Barcode vor die Kamera halten…
          </p>
          <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-black">
            {/* biome-ignore lint: video has no captions by design */}
            <video
              ref={videoRef}
              className="h-auto w-full"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,.8)]" />
          </div>
          {error ? (
            <p className="max-w-sm text-center text-sm text-red-300">{error}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Schließen
          </Button>
        </div>
      ) : null}
    </>
  );
}
