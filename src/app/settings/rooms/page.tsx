import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import {
  createRoomAction,
  deleteRoomAction,
  renameRoomAction,
} from "../actions";
import { ConfirmButton, CreateForm } from "../ui";

export default async function RoomsSettingsPage() {
  await requireOwner();
  const roomList = await db.query.rooms.findMany({
    orderBy: asc(rooms.sortIndex),
    with: { copies: { columns: { id: true } }, shelves: { columns: { id: true } } },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏠 Räume</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <CreateForm action={createRoomAction} submitLabel="Raum anlegen">
        <Input name="name" placeholder="Raumname, z. B. Arbeitszimmer" required />
      </CreateForm>

      <ul className="flex flex-col divide-y rounded-lg border">
        {roomList.map((room) => (
          <li key={room.id} className="flex items-center gap-2 p-3">
            <form action={renameRoomAction} className="flex flex-1 gap-2">
              <input type="hidden" name="id" value={room.id} />
              <Input name="name" defaultValue={room.name} className="max-w-xs" />
              <Button type="submit" size="sm" variant="outline">
                Speichern
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              {room.copies.length} Bücher · {room.shelves.length} Möbel
            </span>
            <ConfirmButton action={deleteRoomAction} id={room.id} />
          </li>
        ))}
        {roomList.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">
            Noch keine Räume.
          </li>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        Beim Löschen eines Raums werden enthaltene Möbel entfernt; die Bücher
        wandern zurück in den Stapel (Raum wird geleert).
      </p>
    </main>
  );
}
