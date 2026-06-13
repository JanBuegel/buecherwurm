import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { shelves, users } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import { NewBookForm } from "./new-book-form";

export default async function NewBookPage() {
  const me = await requireOwner();

  const [owners, shelfList] = await Promise.all([
    db.query.users.findMany({
      columns: { id: true, name: true, role: true },
      orderBy: asc(users.name),
    }),
    db.query.shelves.findMany({
      columns: { id: true, name: true, room: true },
      orderBy: asc(shelves.name),
    }),
  ]);

  // Only owners can hold copies.
  const ownerOptions = owners.filter((u) => u.role === "owner");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buch erfassen</h1>
        <Link
          href="/books"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zum Bestand
        </Link>
      </div>
      <NewBookForm
        owners={ownerOptions}
        shelves={shelfList}
        currentUserId={me.id}
      />
    </main>
  );
}
