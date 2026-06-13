import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { compartments, copies, rooms, shelves } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { RoomView } from "./room-view";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";
  const { id } = await params;

  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (!room) notFound();

  const [furniture, roomCopies] = await Promise.all([
    db.query.shelves.findMany({
      where: eq(shelves.roomId, id),
      orderBy: asc(shelves.sortIndex),
      with: {
        compartments: {
          orderBy: [asc(compartments.row), asc(compartments.col)],
        },
      },
    }),
    db.query.copies.findMany({
      where: eq(copies.roomId, id),
      orderBy: asc(copies.position),
      with: {
        book: { columns: { title: true, authors: true, pageCount: true } },
      },
    }),
  ]);

  return (
    <RoomView
      room={{ id: room.id, name: room.name }}
      isOwner={isOwner}
      furniture={furniture.map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        color: f.color,
        columns: f.columns ?? 1,
        rows: f.rows ?? 1,
        compartments: f.compartments.map((c) => ({
          id: c.id,
          row: c.row,
          col: c.col,
        })),
      }))}
      copies={roomCopies.map((c) => ({
        id: c.id,
        compartmentId: c.compartmentId,
        title: c.book.title,
        author: c.book.authors?.[0] ?? null,
        pageCount: c.book.pageCount,
        spineColor: c.spineColor,
      }))}
    />
  );
}
