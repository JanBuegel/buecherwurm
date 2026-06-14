"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dominantColorFromImage } from "@/lib/dominant-color";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createCopyAction,
  type CreateState,
  lookupBookAction,
} from "../actions";
import { Field, selectClass } from "../form-ui";
import { BarcodeScanner } from "./barcode-scanner";

type Option = { id: string; name: string };

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

export function NewBookForm({
  persons,
  rooms,
  defaultOwnerId,
}: {
  persons: Option[];
  rooms: Option[];
  defaultOwnerId: string;
}) {
  const [form, setForm] = useState<MetaForm>(EMPTY);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  // Local object-URL preview for a freshly picked file (shown before saving).
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [spineColor, setSpineColor] = useState("#8b5e3c");
  // Sticky owner/room — remembered across captures via sessionStorage.
  const [ownerId, setOwnerId] = useState(defaultOwnerId);
  const [roomId, setRoomId] = useState("none");
  const [pending, startTransition] = useTransition();
  const [state, formAction, submitting] = useActionState<
    CreateState,
    FormData
  >(createCopyAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  // Carries the "user confirmed the duplicate" flag on re-submit.
  const confirmRef = useRef<HTMLInputElement>(null);
  const dupRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof MetaForm, value: string) => {
    // Changing the book's identity invalidates a prior duplicate confirmation.
    if ((key === "title" || key === "ean") && confirmRef.current) {
      confirmRef.current.value = "";
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Revoke the object URL when it changes or the form unmounts.
  useEffect(() => {
    if (!coverPreview) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  // Restore the last-used owner/room (only if they still exist).
  useEffect(() => {
    const o = sessionStorage.getItem("bw:lastOwnerId");
    if (o && persons.some((p) => p.id === o)) setOwnerId(o);
    const r = sessionStorage.getItem("bw:lastRoomId");
    if (r && (r === "none" || rooms.some((x) => x.id === r))) setRoomId(r);
  }, [persons, rooms]);

  // Bring the duplicate warning into view as soon as it appears.
  useEffect(() => {
    if (state?.duplicate) {
      dupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  /** Derives the dominant cover colour and uses it as the spine colour. */
  function applyDominantColor(src: string, useCors: boolean) {
    const image = new Image();
    if (useCors) image.crossOrigin = "anonymous";
    image.onload = () => {
      const color = dominantColorFromImage(image);
      if (color) setSpineColor(color);
    };
    image.src = src;
  }

  function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
    applyDominantColor(url, false); // local blob — no CORS issue
  }

  function runLookup(codeArg?: string) {
    const code = (codeArg ?? form.ean).trim();
    if (!code) {
      setLookupMsg("Bitte zuerst eine EAN/ISBN eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await lookupBookAction(code);
      if (result.status === "found") {
        const m = result.meta;
        setForm({
          ean: m.ean ?? code,
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
        // A looked-up cover replaces any previously picked file.
        setCoverPreview(null);
        if (m.coverUrl) applyDominantColor(m.coverUrl, true);
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      {/* hidden fields carrying looked-up metadata */}
      <input ref={confirmRef} type="hidden" name="confirmDuplicate" />
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
          <div className="flex flex-wrap gap-2">
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
              className="min-w-40 flex-1"
            />
            <Button type="button" onClick={() => runLookup()} disabled={pending}>
              {pending ? "Suche …" : "Suchen"}
            </Button>
            <BarcodeScanner
              onDetect={(code) => {
                set("ean", code);
                runLookup(code);
              }}
            />
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
          <div className="flex shrink-0 flex-col items-center gap-2">
            {coverPreview || form.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview ?? form.coverUrl}
                alt="Cover"
                className="h-36 w-24 rounded border object-cover"
              />
            ) : (
              <div className="flex h-36 w-24 items-center justify-center rounded border border-dashed text-center text-xs text-muted-foreground">
                kein Cover
              </div>
            )}
            <Input
              type="file"
              name="coverFile"
              accept="image/*"
              onChange={onCoverFile}
              className="w-24 text-xs"
            />
          </div>

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
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                sessionStorage.setItem("bw:lastOwnerId", e.target.value);
              }}
              className={selectClass}
              required
            >
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Raum">
            <select
              name="roomId"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                sessionStorage.setItem("bw:lastRoomId", e.target.value);
              }}
              className={selectClass}
            >
              <option value="none">— kein Raum —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
          <Field label="Rückenfarbe (Regal) — automatisch aus dem Cover">
            <Input
              name="spineColor"
              type="color"
              value={spineColor}
              onChange={(e) => setSpineColor(e.target.value)}
            />
          </Field>
          <Field label="Notiz" className="sm:col-span-2">
            <Textarea name="notes" rows={2} />
          </Field>
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      {state?.duplicate ? (
        <div
          ref={dupRef}
          className="flex gap-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-5 shadow-lg ring-4 ring-amber-500/20"
        >
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl text-white"
          >
            ⚠️
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold text-amber-900">
              Mögliches Duplikat
            </p>
            <p className="text-sm text-amber-900">
              „{state.duplicate.title}" ist bereits{" "}
              <strong>
                {state.duplicate.count === 1
                  ? "einmal"
                  : `${state.duplicate.count}-mal`}
              </strong>{" "}
              im Bestand. Soll wirklich ein weiteres Exemplar angelegt werden?
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  if (confirmRef.current) confirmRef.current.value = "1";
                  formRef.current?.requestSubmit();
                }}
              >
                {submitting ? "Speichern …" : "Ja, trotzdem anlegen"}
              </Button>
              <span className="text-xs text-amber-800/80">
                Oder ändere Titel/EAN, um ein anderes Buch zu erfassen.
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern …" : "Buch hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
