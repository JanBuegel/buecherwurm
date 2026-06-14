import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { copies, persons as personsTable, rooms as roomsTable, tags as tagsTable } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { BookList } from "./book-list";
import { FilterBar } from "./filter-bar";

type SearchParams = {
  q?: string;
  owner?: string;
  room?: string;
  tag?: string | string[];
  status?: string;
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";
  const sp = await searchParams;

  const [list, personList, roomList, tagList] = await Promise.all([
    db.query.copies.findMany({
      orderBy: desc(copies.createdAt),
      with: {
        book: true,
        owner: { columns: { id: true, name: true } },
        room: { columns: { id: true, name: true } },
        copyTags: {
          with: { tag: { columns: { id: true, name: true, color: true } } },
        },
      },
    }),
    db.query.persons.findMany({
      columns: { id: true, name: true },
      orderBy: asc(personsTable.name),
    }),
    db.query.rooms.findMany({
      columns: { id: true, name: true },
      orderBy: asc(roomsTable.sortIndex),
    }),
    db.query.tags.findMany({
      columns: { id: true, name: true },
      orderBy: asc(tagsTable.name),
    }),
  ]);

  // --- in-memory filtering (collection size is small) ---
  const q = sp.q?.trim().toLowerCase() ?? "";
  const tagIds = Array.isArray(sp.tag) ? sp.tag : sp.tag ? [sp.tag] : [];
  const filtered = list.filter((copy) => {
    if (sp.owner && copy.ownerId !== sp.owner) return false;
    if (sp.room) {
      if (sp.room === "none" ? copy.roomId !== null : copy.roomId !== sp.room)
        return false;
    }
    if (sp.status && copy.status !== sp.status) return false;
    // must carry *all* selected tags
    if (
      tagIds.length &&
      !tagIds.every((id) => copy.copyTags.some((ct) => ct.tag.id === id))
    )
      return false;
    if (q) {
      const haystack = [
        copy.book.title,
        copy.book.subtitle ?? "",
        copy.book.publisher ?? "",
        ...(copy.book.authors ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = Boolean(
    sp.q || sp.owner || sp.room || sp.status || tagIds.length,
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div>
          <h1 className="text-2xl font-bold">Bestand</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length}
            {hasFilters ? ` von ${list.length}` : ""}{" "}
            {list.length === 1 ? "Exemplar" : "Exemplare"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Start
          </Link>
          {isOwner ? (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/books/new" />}
            >
              + Buch erfassen
            </Button>
          ) : null}
        </div>
      </div>

      <FilterBar
        persons={personList}
        rooms={roomList}
        tags={tagList}
        values={sp}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {list.length === 0
            ? "Noch keine Bücher erfasst."
            : "Keine Treffer für die aktuellen Filter."}
          {list.length === 0 && isOwner ? (
            <>
              {" "}
              <Link href="/books/new" className="text-foreground underline">
                Jetzt das erste Buch hinzufügen.
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <BookList
          isOwner={isOwner}
          owners={personList}
          rooms={roomList}
          tagSuggestions={tagList.map((t) => t.name)}
          items={filtered.map((copy) => ({
            id: copy.id,
            title: copy.book.title,
            subtitle: copy.book.subtitle,
            authors: copy.book.authors ?? [],
            coverUrl: copy.book.coverUrl,
            status: copy.status,
            ownerName: copy.owner.name,
            roomName: copy.room?.name ?? null,
            tags: copy.copyTags.map((ct) => ({
              name: ct.tag.name,
              color: ct.tag.color,
            })),
          }))}
        />
      )}
    </main>
  );
}
