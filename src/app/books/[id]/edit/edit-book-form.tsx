"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_OPTIONS, CONDITION_OPTIONS } from "@/lib/book-display";
import { type CreateState, updateCopyAction } from "../../actions";
import { Field, selectClass } from "../../form-ui";

type Initial = {
  copyId: string;
  ean: string;
  isbn10: string;
  title: string;
  subtitle: string;
  authors: string;
  publisher: string;
  publishedYear: string;
  pageCount: string;
  language: string;
  description: string;
  coverUrl: string;
  ownerId: string;
  shelfId: string;
  status: string;
  condition: string;
  tags: string;
  purchasePrice: string;
  spineColor: string;
  notes: string;
};

type Option = { id: string; name: string; room?: string | null };

export function EditBookForm({
  initial,
  owners,
  shelves,
}: {
  initial: Initial;
  owners: Option[];
  shelves: Option[];
}) {
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [state, formAction, submitting] = useActionState<
    CreateState,
    FormData
  >(updateCopyAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="copyId" value={initial.copyId} />
      <input type="hidden" name="isbn10" defaultValue={initial.isbn10} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchdaten</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Cover"
              className="h-36 w-24 shrink-0 rounded border object-cover"
            />
          ) : (
            <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded border border-dashed text-center text-xs text-muted-foreground">
              kein Cover
            </div>
          )}

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Titel *" className="sm:col-span-2">
              <Input name="title" defaultValue={initial.title} required />
            </Field>
            <Field label="Untertitel" className="sm:col-span-2">
              <Input name="subtitle" defaultValue={initial.subtitle} />
            </Field>
            <Field label="Autor(en) — Komma-getrennt" className="sm:col-span-2">
              <Input name="authors" defaultValue={initial.authors} />
            </Field>
            <Field label="Verlag">
              <Input name="publisher" defaultValue={initial.publisher} />
            </Field>
            <Field label="Erscheinungsjahr">
              <Input
                name="publishedYear"
                type="number"
                defaultValue={initial.publishedYear}
              />
            </Field>
            <Field label="Seiten">
              <Input
                name="pageCount"
                type="number"
                defaultValue={initial.pageCount}
              />
            </Field>
            <Field label="Sprache">
              <Input name="language" defaultValue={initial.language} />
            </Field>
            <Field label="EAN / ISBN">
              <Input name="ean" defaultValue={initial.ean} />
            </Field>
            <Field label="Cover-URL">
              <Input
                name="coverUrl"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </Field>
            <Field label="Beschreibung" className="sm:col-span-2">
              <Textarea
                name="description"
                defaultValue={initial.description}
                rows={3}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemplar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Inhaber *">
            <select
              name="ownerId"
              defaultValue={initial.ownerId}
              className={selectClass}
              required
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Standort / Regal">
            <select
              name="shelfId"
              defaultValue={initial.shelfId}
              className={selectClass}
            >
              <option value="none">— kein Regal —</option>
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.room ? `${s.room} · ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={initial.status}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zustand">
            <select
              name="condition"
              defaultValue={initial.condition}
              className={selectClass}
            >
              <option value="">— k. A. —</option>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags — Komma-getrennt" className="sm:col-span-2">
            <Input name="tags" defaultValue={initial.tags} />
          </Field>
          <Field label="Kaufpreis (€)">
            <Input
              name="purchasePrice"
              defaultValue={initial.purchasePrice}
              inputMode="decimal"
            />
          </Field>
          <Field label="Rückenfarbe (Regal)">
            <Input
              name="spineColor"
              type="color"
              defaultValue={initial.spineColor}
            />
          </Field>
          <Field label="Notiz" className="sm:col-span-2">
            <Textarea name="notes" defaultValue={initial.notes} rows={2} />
          </Field>
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern …" : "Änderungen speichern"}
        </Button>
      </div>
    </form>
  );
}
