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
} from "@/lib/book-display";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { DeleteCopyButton } from "./delete-copy-button";

export default async function CopyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";
  const { id } = await params;

  const copy = await db.query.copies.findFirst({
    where: eq(copies.id, id),
    with: {
      book: true,
      owner: { columns: { name: true } },
      shelf: { columns: { name: true, room: true } },
      copyTags: { with: { tag: { columns: { id: true, name: true } } } },
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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <Link
          href="/books"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zum Bestand
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

      <div className="flex flex-col gap-6 sm:flex-row">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="h-60 w-40 shrink-0 self-center rounded border object-cover sm:self-start"
          />
        ) : (
          <div className="flex h-60 w-40 shrink-0 items-center justify-center self-center rounded border border-dashed text-sm text-muted-foreground sm:self-start">
            kein Cover
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          {book.subtitle ? (
            <p className="text-lg text-muted-foreground">{book.subtitle}</p>
          ) : null}
          {authors.length ? (
            <p className="text-base">{authors.join(", ")}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{statusLabel(copy.status)}</Badge>
            {copy.copyTags.map((ct) => (
              <Badge key={ct.tag.id} variant="outline">
                {ct.tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemplar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Inhaber" value={copy.owner.name} />
          <Detail
            label="Standort"
            value={
              copy.shelf
                ? copy.shelf.room
                  ? `${copy.shelf.room} · ${copy.shelf.name}`
                  : copy.shelf.name
                : "—"
            }
          />
          <Detail label="Status" value={statusLabel(copy.status)} />
          <Detail label="Zustand" value={conditionLabel(copy.condition) ?? "—"} />
          <Detail label="Kaufpreis" value={formatPrice(copy.purchasePriceCents) ?? "—"} />
          {copy.notes ? (
            <Detail label="Notiz" value={copy.notes} className="col-span-2" />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Verlag" value={book.publisher ?? "—"} />
          <Detail
            label="Erscheinungsjahr"
            value={book.publishedYear ? String(book.publishedYear) : "—"}
          />
          <Detail
            label="Seiten"
            value={book.pageCount ? String(book.pageCount) : "—"}
          />
          <Detail label="Sprache" value={book.language ?? "—"} />
          <Detail label="EAN" value={book.ean ?? "—"} />
          <Detail label="ISBN-10" value={book.isbn10 ?? "—"} />
          {book.description ? (
            <Detail
              label="Beschreibung"
              value={book.description}
              className="col-span-2"
            />
          ) : null}
        </CardContent>
      </Card>

      {siblings.length ? (
        <p className="text-sm text-muted-foreground">
          📚 {siblings.length} weitere{siblings.length === 1 ? "s" : ""}{" "}
          Exemplar{siblings.length === 1 ? "" : "e"} dieses Titels (Inhaber:{" "}
          {siblings.map((s) => s.owner.name).join(", ")}).
        </p>
      ) : null}
    </main>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
