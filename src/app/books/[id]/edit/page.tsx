import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { copies, persons, rooms } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import { EditBookForm } from "./edit-book-form";

export default async function EditCopyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwner();
  const { id } = await params;

  const copy = await db.query.copies.findFirst({
    where: eq(copies.id, id),
    with: {
      book: true,
      copyTags: { with: { tag: { columns: { name: true } } } },
    },
  });
  if (!copy) notFound();

  const [personList, roomList] = await Promise.all([
    db.query.persons.findMany({
      columns: { id: true, name: true },
      orderBy: asc(persons.name),
    }),
    db.query.rooms.findMany({
      columns: { id: true, name: true },
      orderBy: asc(rooms.sortIndex),
    }),
  ]);

  const initial = {
    copyId: copy.id,
    ean: copy.book.ean ?? "",
    isbn10: copy.book.isbn10 ?? "",
    title: copy.book.title,
    subtitle: copy.book.subtitle ?? "",
    authors: (copy.book.authors ?? []).join(", "),
    publisher: copy.book.publisher ?? "",
    publishedYear: copy.book.publishedYear ? String(copy.book.publishedYear) : "",
    pageCount: copy.book.pageCount ? String(copy.book.pageCount) : "",
    language: copy.book.language ?? "",
    description: copy.book.description ?? "",
    coverUrl: copy.book.coverUrl ?? "",
    ownerId: copy.ownerId,
    roomId: copy.roomId ?? "none",
    status: copy.status,
    condition: copy.condition ?? "",
    tags: copy.copyTags.map((ct) => ct.tag.name).join(", "),
    purchasePrice:
      copy.purchasePriceCents != null
        ? (copy.purchasePriceCents / 100).toFixed(2).replace(".", ",")
        : "",
    spineColor: copy.spineColor ?? "#8b5e3c",
    notes: copy.notes ?? "",
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buch bearbeiten</h1>
        <Link
          href={`/books/${copy.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zurück
        </Link>
      </div>
      <EditBookForm
        initial={initial}
        persons={personList}
        rooms={roomList}
      />
    </main>
  );
}
