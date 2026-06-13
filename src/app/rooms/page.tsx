import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { copies, rooms as roomsTable } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export default async function RoomsPage() {
  await requireUser();

  const roomList = await db.query.rooms.findMany({
    orderBy: asc(roomsTable.sortIndex),
    with: {
      shelves: { columns: { id: true } },
      copies: { columns: { id: true, compartmentId: true } },
    },
  });

  const unassignedCount = (
    await db.query.copies.findMany({ columns: { id: true, roomId: true } })
  ).filter((c) => c.roomId === null).length;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏠 Räume</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Start
        </Link>
      </div>

      {roomList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Noch keine Räume.{" "}
          <Link href="/settings/rooms" className="text-foreground underline">
            Räume anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roomList.map((room) => {
            const shelved = room.copies.filter((c) => c.compartmentId).length;
            const stacked = room.copies.length - shelved;
            return (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    <CardDescription>
                      {room.shelves.length} Möbel · {shelved} eingeräumt ·{" "}
                      {stacked} im Stapel
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {unassignedCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {unassignedCount} Bücher ohne Raum — beim Erfassen oder Bearbeiten
          einem Raum zuweisen.
        </p>
      ) : null}
    </main>
  );
}
