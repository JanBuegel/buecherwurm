import { and, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { copies } from "@/db/schema";
import {
  conditionLabel,
  formatPrice,
  statusLabel,
  statusTone,
} from "@/lib/book-display";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { DeleteCopyButton } from "./delete-copy-button";

export default async function CopyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";
  const { id } = await params;
  const { from } = await searchParams;

  // Return to the originating shelf when arriving from a room; else the list.
  const backToRoom = typeof from === "string" && from.startsWith("/rooms/");
  const backHref = backToRoom ? from : "/books";
  const backLabel = backToRoom ? "← Zurück ins Regal" : "← Zum Bestand";

  const copy = await db.query.copies.findFirst({
    where: eq(copies.id, id),
    with: {
      book: true,
      owner: { columns: { name: true } },
      room: { columns: { name: true } },
      copyTags: {
        with: { tag: { columns: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!copy) notFound();

  const siblings = await db.query.copies.findMany({
    where: and(eq(copies.bookId, copy.bookId), ne(copies.id, copy.id)),
    columns: { id: true },
    with: { owner: { columns: { name: true } } },
  });

  const { book } = copy;
  const authors = book.authors ?? [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:underline"
        >
          {backLabel}
        </Link>
        {isOwner ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/books/${copy.id}/edit`} />}
            >
              Bearbeiten
            </Button>
            <DeleteCopyButton copyId={copy.id} />
          </div>
        ) : null}
      </div>

      {/* hero */}
      <section className="flex flex-col gap-6 sm:flex-row">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="mx-auto h-64 w-44 shrink-0 rounded-lg object-cover shadow-xl ring-1 ring-black/10 sm:mx-0"
          />
        ) : (
          <div className="mx-auto flex h-64 w-44 shrink-0 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground sm:mx-0">
            kein Cover
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">
              {book.title}
            </h1>
            {book.subtitle ? (
              <p className="mt-1 text-lg text-muted-foreground">
                {book.subtitle}
              </p>
            ) : null}
          </div>
          {authors.length ? (
            <p className="text-base font-medium">{authors.join(", ")}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(
                copy.status,
              )}`}
            >
              {statusLabel(copy.status)}
            </span>
            {copy.copyTags.map((ct) => (
              <TagPill key={ct.tag.id} name={ct.tag.name} color={ct.tag.color} />
            ))}
          </div>
          {siblings.length ? (
            <p className="mt-1 text-sm text-muted-foreground">
              📚 {siblings.length} weitere
              {siblings.length === 1 ? "s" : ""} Exemplar
              {siblings.length === 1 ? "" : "e"} dieses Titels (
              {siblings.map((s) => s.owner.name).join(", ")})
            </p>
          ) : null}
        </div>
      </section>

      {/* info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📦 Exemplar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Inhaber" value={copy.owner.name} />
            <Detail
              label="Standort"
              value={copy.room ? copy.room.name : "📚 Stapel"}
            />
            <Detail label="Status" value={statusLabel(copy.status)} />
            <Detail
              label="Zustand"
              value={conditionLabel(copy.condition) ?? "—"}
            />
            <Detail
              label="Kaufpreis"
              value={formatPrice(copy.purchasePriceCents) ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📖 Buchdaten</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Verlag" value={book.publisher ?? "—"} />
            <Detail
              label="Jahr"
              value={book.publishedYear ? String(book.publishedYear) : "—"}
            />
            <Detail
              label="Seiten"
              value={book.pageCount ? String(book.pageCount) : "—"}
            />
            <Detail label="Sprache" value={book.language ?? "—"} />
            <Detail label="EAN" value={book.ean ?? "—"} />
            <Detail label="ISBN-10" value={book.isbn10 ?? "—"} />
          </CardContent>
        </Card>
      </div>

      {book.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beschreibung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {book.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {copy.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📝 Notiz</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{copy.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function TagPill({ name, color }: { name: string; color: string | null }) {
  if (!color) {
    return (
      <Badge variant="outline" className="font-normal">
        {name}
      </Badge>
    );
  }
  return (
    <span
      style={{
        backgroundColor: `${color}22`,
        color,
        borderColor: `${color}55`,
      }}
      className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
    >
      {name}
    </span>
  );
}
