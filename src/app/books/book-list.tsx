"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusLabel } from "@/lib/book-display";
import {
  addTagsToCopiesAction,
  removeTagsFromCopiesAction,
  setOwnerForCopiesAction,
  setRoomForCopiesAction,
} from "./actions";
import { selectClass } from "./form-ui";

type Option = { id: string; name: string };
type TagRef = { name: string; color: string | null };

export type BookListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  status: string;
  ownerName: string;
  roomName: string | null;
  tags: TagRef[];
};

export function BookList({
  items,
  owners,
  rooms,
  tagSuggestions,
  isOwner,
}: {
  items: BookListItem[];
  owners: Option[];
  rooms: Option[];
  tagSuggestions: string[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setSelecting(false);
    setSelected(new Set());
    setTagInput("");
  }

  /** Runs a batch action, then refreshes — keeping the current selection. */
  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function applyAddTags() {
    const names = tagInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!selected.size || !names.length) return;
    const ids = [...selected];
    run(async () => {
      await addTagsToCopiesAction(ids, names);
      setTagInput("");
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  // Tags currently present on the selection — offered for one-click removal.
  const selectedTags = [
    ...new Map(
      items
        .filter((i) => selected.has(i.id))
        .flatMap((i) => i.tags)
        .map((t) => [t.name, t] as const),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div className="flex flex-col gap-3">
      {isOwner ? (
        <div className="flex items-center gap-3">
          {selecting ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    allSelected ? new Set() : new Set(items.map((i) => i.id)),
                  )
                }
                className="text-sm font-medium text-foreground hover:underline"
              >
                {allSelected ? "Keine" : "Alle"} auswählen
              </button>
              <span className="text-sm text-muted-foreground">
                {selected.size} ausgewählt
              </span>
              <button
                type="button"
                onClick={reset}
                className="ml-auto text-sm text-muted-foreground hover:underline"
              >
                Fertig
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              ☑️ Mehrere auswählen
            </button>
          )}
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const isSel = selected.has(item.id);
          const inner = (
            <CardInner item={item} selecting={selecting} selected={isSel} />
          );
          return (
            <li key={item.id} className="min-w-0">
              {selecting ? (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full text-left"
                  aria-pressed={isSel}
                >
                  {inner}
                </button>
              ) : (
                <Link href={`/books/${item.id}`} className="block">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {selecting && selected.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-lg ring-1 ring-foreground/10">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "Buch" : "Bücher"} ausgewählt
          </span>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Inhaber
              <select
                value=""
                disabled={pending}
                className={`${selectClass} sm:w-auto`}
                onChange={(e) => {
                  const ownerId = e.target.value;
                  if (!ownerId) return;
                  const ids = [...selected];
                  run(() => setOwnerForCopiesAction(ids, ownerId));
                }}
              >
                <option value="">— ändern —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Raum
              <select
                value=""
                disabled={pending}
                className={`${selectClass} sm:w-auto`}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const ids = [...selected];
                  const room = value === "none" ? null : value;
                  run(() => setRoomForCopiesAction(ids, room));
                }}
              >
                <option value="">— ändern —</option>
                <option value="none">📚 Kein Raum (Stapel)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">
                Tags hinzufügen
                <Input
                  list="batch-tag-suggestions"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Komma-getrennt"
                  className="w-full sm:w-48"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyAddTags();
                    }
                  }}
                />
              </label>
              <datalist id="batch-tag-suggestions">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <Button
                type="button"
                onClick={applyAddTags}
                disabled={!tagInput.trim() || pending}
                className="shrink-0"
              >
                Hinzufügen
              </Button>
            </div>
          </div>

          {selectedTags.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                Tags entfernen:
              </span>
              {selectedTags.map((t) => {
                const ids = [...selected];
                return (
                  <button
                    key={t.name}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => removeTagsFromCopiesAction(ids, [t.name]))
                    }
                    style={
                      t.color
                        ? {
                            backgroundColor: `${t.color}22`,
                            color: t.color,
                            borderColor: `${t.color}55`,
                          }
                        : undefined
                    }
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs hover:border-destructive hover:text-destructive disabled:opacity-50"
                  >
                    {t.name} <span aria-hidden>✕</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CardInner({
  item,
  selecting,
  selected,
}: {
  item: BookListItem;
  selecting: boolean;
  selected: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border bg-card p-3 shadow-sm ring-1 transition-all duration-200 sm:gap-5 sm:p-4 ${
        selected
          ? "ring-2 ring-primary"
          : "ring-foreground/5 hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/15"
      }`}
    >
      <div className="relative shrink-0">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt=""
            className="h-28 w-20 rounded border object-cover sm:h-40 sm:w-28"
          />
        ) : (
          <div className="flex h-28 w-20 items-center justify-center rounded border border-dashed text-center text-xs text-muted-foreground sm:h-40 sm:w-28">
            kein Cover
          </div>
        )}
        {selecting ? (
          <span
            className={`absolute -top-2 -left-2 grid size-6 place-items-center rounded-full border-2 border-card shadow ${
              selected ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {selected ? <Check className="size-3.5" /> : null}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{item.title}</p>
            {item.subtitle ? (
              <p className="truncate text-sm text-muted-foreground">
                {item.subtitle}
              </p>
            ) : null}
            {item.authors.length ? (
              <p className="truncate text-sm text-muted-foreground">
                {item.authors.join(", ")}
              </p>
            ) : null}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {statusLabel(item.status)}
          </Badge>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>👤 {item.ownerName}</span>
          {item.roomName ? (
            <span>· 📍 {item.roomName}</span>
          ) : (
            <span>· 📚 Stapel</span>
          )}
          {item.tags.map((t) => (
            <TagChip key={t.name} tag={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TagChip({ tag }: { tag: TagRef }) {
  if (!tag.color) {
    return (
      <Badge variant="outline" className="font-normal">
        {tag.name}
      </Badge>
    );
  }
  return (
    <span
      style={{
        backgroundColor: `${tag.color}22`,
        color: tag.color,
        borderColor: `${tag.color}55`,
      }}
      className="rounded-full border px-2 py-0.5 text-xs font-medium"
    >
      {tag.name}
    </span>
  );
}
