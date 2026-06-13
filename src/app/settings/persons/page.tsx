import { asc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import {
  createPersonAction,
  deletePersonAction,
  renamePersonAction,
} from "../actions";
import { ConfirmButton, CreateForm } from "../ui";

export default async function PersonsSettingsPage() {
  await requireOwner();
  const personList = await db.query.persons.findMany({
    orderBy: asc(persons.name),
    with: {
      copies: { columns: { id: true } },
      user: { columns: { name: true, email: true } },
    },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Inhaber</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <CreateForm action={createPersonAction} submitLabel="Person anlegen">
        <Input name="name" placeholder="Name, z. B. Lisa" required />
      </CreateForm>

      <ul className="flex flex-col divide-y rounded-lg border">
        {personList.map((person) => {
          const count = person.copies.length;
          return (
            <li key={person.id} className="flex flex-wrap items-center gap-2 p-3">
              <form action={renamePersonAction} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={person.id} />
                <Input
                  name="name"
                  defaultValue={person.name}
                  className="max-w-xs"
                />
                <Button type="submit" size="sm" variant="outline">
                  Speichern
                </Button>
              </form>
              {person.user ? (
                <Badge variant="secondary">Konto: {person.user.name}</Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {count} {count === 1 ? "Buch" : "Bücher"}
              </span>
              {count === 0 ? (
                <ConfirmButton action={deletePersonAction} id={person.id} />
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  (löschbar, wenn 0 Bücher)
                </span>
              )}
            </li>
          );
        })}
        {personList.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">
            Noch keine Personen.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
