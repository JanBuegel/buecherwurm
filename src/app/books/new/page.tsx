import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { persons, rooms } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import { NewBookForm } from "./new-book-form";

export default async function NewBookPage() {
  const me = await requireOwner();

  const [personList, roomList] = await Promise.all([
    db.query.persons.findMany({
      columns: { id: true, name: true, userId: true },
      orderBy: asc(persons.name),
    }),
    db.query.rooms.findMany({
      columns: { id: true, name: true },
      orderBy: asc(rooms.sortIndex),
    }),
  ]);

  // Default owner = the person linked to the current account, if any.
  const myPerson = personList.find((p) => p.userId === me.id);
  const defaultOwnerId = myPerson?.id ?? personList[0]?.id ?? "";

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
        persons={personList}
        rooms={roomList}
        defaultOwnerId={defaultOwnerId}
      />
    </main>
  );
}
