"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createCopyAction,
  type CreateState,
  lookupBookAction,
} from "../actions";

type Option = { id: string; name: string; room?: string | null };

type MetaForm = {
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
  metadataSource: string;
};

const EMPTY: MetaForm = {
  ean: "",
  isbn10: "",
  title: "",
  subtitle: "",
  authors: "",
  publisher: "",
  publishedYear: "",
  pageCount: "",
  language: "",
  description: "",
  coverUrl: "",
  metadataSource: "",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export function NewBookForm({
  owners,
  shelves,
  currentUserId,
}: {
  owners: Option[];
  shelves: Option[];
  currentUserId: string;
}) {
  const [form, setForm] = useState<MetaForm>(EMPTY);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, formAction, submitting] = useActionState<
    CreateState,
    FormData
  >(createCopyAction, null);

  const set = (key: keyof MetaForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function runLookup() {
    if (!form.ean.trim()) {
      setLookupMsg("Bitte zuerst eine EAN/ISBN eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await lookupBookAction(form.ean);
      if (result.status === "found") {
        const m = result.meta;
        setForm({
          ean: m.ean ?? form.ean,
          isbn10: m.isbn10 ?? "",
          title: m.title,
          subtitle: m.subtitle ?? "",
          authors: m.authors.join(", "),
          publisher: m.publisher ?? "",
          publishedYear: m.publishedYear ? String(m.publishedYear) : "",
          pageCount: m.pageCount ? String(m.pageCount) : "",
          language: m.language ?? "",
          description: m.description ?? "",
          coverUrl: m.coverUrl ?? "",
          metadataSource: m.sources.join("+"),
        });
        setLookupMsg(`Gefunden über: ${m.sources.join(", ")}`);
      } else if (result.status === "notfound") {
        setForm((f) => ({ ...EMPTY, ean: result.ean }));
        setLookupMsg(
          "Keine Metadaten gefunden — bitte die Felder manuell ausfüllen.",
        );
      } else {
        setLookupMsg("Bitte zuerst eine EAN/ISBN eingeben.");
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* hidden fields carrying looked-up metadata */}
      <input type="hidden" name="isbn10" value={form.isbn10} readOnly />
      <input type="hidden" name="coverUrl" value={form.coverUrl} readOnly />
      <input
        type="hidden"
        name="metadataSource"
        value={form.metadataSource}
        readOnly
      />

      {/* ---------------------------------------------------- lookup --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EAN / ISBN</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              name="ean"
              value={form.ean}
              onChange={(e) => set("ean", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runLookup();
                }
              }}
              placeholder="z. B. 9783499256356"
              autoFocus
            />
            <Button type="button" onClick={runLookup} disabled={pending}>
              {pending ? "Suche …" : "Suchen"}
            </Button>
          </div>
          {lookupMsg ? (
            <p className="text-sm text-muted-foreground">{lookupMsg}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ book data --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchdaten</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {form.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.coverUrl}
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
              <Input
                name="title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
            </Field>
            <Field label="Untertitel" className="sm:col-span-2">
              <Input
                name="subtitle"
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
              />
            </Field>
            <Field label="Autor(en) — Komma-getrennt" className="sm:col-span-2">
              <Input
                name="authors"
                value={form.authors}
                onChange={(e) => set("authors", e.target.value)}
                placeholder="Vorname Nachname, …"
              />
            </Field>
            <Field label="Verlag">
              <Input
                name="publisher"
                value={form.publisher}
                onChange={(e) => set("publisher", e.target.value)}
              />
            </Field>
            <Field label="Erscheinungsjahr">
              <Input
                name="publishedYear"
                type="number"
                value={form.publishedYear}
                onChange={(e) => set("publishedYear", e.target.value)}
              />
            </Field>
            <Field label="Seiten">
              <Input
                name="pageCount"
                type="number"
                value={form.pageCount}
                onChange={(e) => set("pageCount", e.target.value)}
              />
            </Field>
            <Field label="Sprache">
              <Input
                name="language"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                placeholder="de"
              />
            </Field>
            <Field label="Beschreibung" className="sm:col-span-2">
              <Textarea
                name="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------- copy details --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemplar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Inhaber *">
            <select
              name="ownerId"
              defaultValue={currentUserId}
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
            <select name="shelfId" defaultValue="none" className={selectClass}>
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
              defaultValue="available"
              className={selectClass}
            >
              <option value="available">Verfügbar</option>
              <option value="reading">Lese gerade</option>
              <option value="read">Gelesen</option>
              <option value="lent">Verliehen</option>
            </select>
          </Field>
          <Field label="Zustand">
            <select name="condition" defaultValue="" className={selectClass}>
              <option value="">— k. A. —</option>
              <option value="new">Neu</option>
              <option value="good">Gut</option>
              <option value="worn">Abgenutzt</option>
            </select>
          </Field>
          <Field label="Tags — Komma-getrennt" className="sm:col-span-2">
            <Input name="tags" placeholder="Lieblingsbuch, Krimi, …" />
          </Field>
          <Field label="Kaufpreis (€)">
            <Input name="purchasePrice" placeholder="8,99" inputMode="decimal" />
          </Field>
          <Field label="Rückenfarbe (Regal)">
            <Input name="spineColor" type="color" defaultValue="#8b5e3c" />
          </Field>
          <Field label="Notiz" className="sm:col-span-2">
            <Textarea name="notes" rows={2} />
          </Field>
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern …" : "Buch hinzufügen"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
