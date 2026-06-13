"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { STATUS_OPTIONS } from "@/lib/book-display";
import { selectClass } from "./form-ui";

type Option = { id: string; name: string; room?: string | null };

export function FilterBar({
  persons,
  rooms,
  tags,
  values,
}: {
  persons: Option[];
  rooms: Option[];
  tags: Option[];
  values: {
    q?: string;
    owner?: string;
    room?: string;
    tag?: string;
    status?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(values.q ?? "");
  const firstRender = useRef(true);

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(next.toString() ? `${pathname}?${next}` : pathname);
    });
  }

  // Debounce the free-text search.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => apply("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(
    values.q || values.owner || values.room || values.tag || values.status,
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Suche: Titel, Autor, Verlag …"
        className="w-full sm:w-64"
      />

      {/* On mobile a tidy 2-column grid; inline from sm upwards. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={values.owner ?? ""}
          onChange={(e) => apply("owner", e.target.value)}
          className={`${selectClass} sm:w-auto`}
          aria-label="Inhaber"
        >
          <option value="">Alle Inhaber</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={values.room ?? ""}
          onChange={(e) => apply("room", e.target.value)}
          className={`${selectClass} sm:w-auto`}
          aria-label="Raum"
        >
          <option value="">Alle Räume</option>
          <option value="none">Im Stapel</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={values.status ?? ""}
          onChange={(e) => apply("status", e.target.value)}
          className={`${selectClass} sm:w-auto`}
          aria-label="Status"
        >
          <option value="">Alle Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {tags.length ? (
          <select
            value={values.tag ?? ""}
            onChange={(e) => apply("tag", e.target.value)}
            className={`${selectClass} sm:w-auto`}
            aria-label="Tag"
          >
            <option value="">Alle Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : null}

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname));
            }}
            className="col-span-2 h-9 rounded-md text-sm text-muted-foreground hover:text-foreground hover:underline sm:col-auto sm:h-auto"
          >
            zurücksetzen
          </button>
        ) : null}
      </div>
    </div>
  );
}
