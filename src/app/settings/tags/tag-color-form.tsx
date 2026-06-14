"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { readableText } from "@/lib/spine";
import { setTagColorAction } from "../actions";

/**
 * Tag colour picker that shows a live preview chip and saves immediately on
 * change — no separate submit button.
 */
export function TagColorForm({
  id,
  name,
  color,
}: {
  id: string;
  name: string;
  color: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(color ?? "#64748b");

  // Clear any pending save if the component unmounts.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <form ref={formRef} action={setTagColorAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input
        name="color"
        type="color"
        value={value}
        onChange={(e) => {
          setValue(e.target.value); // instant preview
          // Debounce the save so dragging the picker doesn't spam the server.
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => formRef.current?.requestSubmit(), 350);
        }}
        className="w-10 p-1"
        aria-label={`Farbe für ${name}`}
      />
      <span
        className="max-w-[10rem] truncate rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: value, color: readableText(value) }}
      >
        {name}
      </span>
    </form>
  );
}
