import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { copies } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";

const STATUS_LABELS: Record<string, string> = {
  available: "Verfügbar",
  reading: "Lese gerade",
  read: "Gelesen",
  lent: "Verliehen",
};

export default async function BooksPage() {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";

  const list = await db.query.copies.findMany({
    orderBy: desc(copies.createdAt),
    with: {
      book: true,
      owner: { columns: { name: true } },
      shelf: { columns: { name: true, room: true } },
      copyTags: { with: { tag: { columns: { name: true } } } },
    },
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bestand</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "Exemplar" : "Exemplare"}
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

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Noch keine Bücher erfasst.
          {isOwner ? (
            <>
              {" "}
              <Link href="/books/new" className="text-foreground underline">
                Jetzt das erste Buch hinzufügen.
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((copy) => {
            const authors = copy.book.authors ?? [];
            const tagNames = copy.copyTags.map((ct) => ct.tag.name);
            return (
              <li
                key={copy.id}
                className="flex gap-4 rounded-lg border bg-card p-3"
              >
                {copy.book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={copy.book.coverUrl}
                    alt=""
                    className="h-24 w-16 shrink-0 rounded border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded border border-dashed text-center text-[10px] text-muted-foreground">
                    kein Cover
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{copy.book.title}</p>
                      {authors.length ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {authors.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {STATUS_LABELS[copy.status] ?? copy.status}
                    </Badge>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>👤 {copy.owner.name}</span>
                    {copy.shelf ? (
                      <span>
                        · 📍{" "}
                        {copy.shelf.room
                          ? `${copy.shelf.room} · ${copy.shelf.name}`
                          : copy.shelf.name}
                      </span>
                    ) : null}
                    {tagNames.map((t) => (
                      <Badge key={t} variant="outline" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
