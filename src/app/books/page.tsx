import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { copies, persons as personsTable, rooms as roomsTable, tags as tagsTable } from "@/db/schema";
import { statusLabel } from "@/lib/book-display";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { FilterBar } from "./filter-bar";

type SearchParams = {
  q?: string;
  owner?: string;
  room?: string;
  tag?: string;
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
        copyTags: { with: { tag: { columns: { id: true, name: true } } } },
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
  const filtered = list.filter((copy) => {
    if (sp.owner && copy.ownerId !== sp.owner) return false;
    if (sp.room) {
      if (sp.room === "none" ? copy.roomId !== null : copy.roomId !== sp.room)
        return false;
    }
    if (sp.status && copy.status !== sp.status) return false;
    if (sp.tag && !copy.copyTags.some((ct) => ct.tag.id === sp.tag)) return false;
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
    sp.q || sp.owner || sp.room || sp.status || sp.tag,
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((copy) => {
            const authors = copy.book.authors ?? [];
            const tagNames = copy.copyTags.map((ct) => ct.tag.name);
            return (
              <li key={copy.id}>
                <Link
                  href={`/books/${copy.id}`}
                  className="flex gap-5 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/15"
                >
                  {copy.book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={copy.book.coverUrl}
                      alt=""
                      className="h-40 w-28 shrink-0 rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-28 shrink-0 items-center justify-center rounded border border-dashed text-center text-xs text-muted-foreground">
                      kein Cover
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold">
                          {copy.book.title}
                        </p>
                        {copy.book.subtitle ? (
                          <p className="truncate text-sm text-muted-foreground">
                            {copy.book.subtitle}
                          </p>
                        ) : null}
                        {authors.length ? (
                          <p className="truncate text-sm text-muted-foreground">
                            {authors.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {statusLabel(copy.status)}
                      </Badge>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>👤 {copy.owner.name}</span>
                      {copy.room ? (
                        <span>· 📍 {copy.room.name}</span>
                      ) : (
                        <span>· 📚 Stapel</span>
                      )}
                      {tagNames.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="font-normal"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
