import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { rooms as roomsTable } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";

const SPINE_PALETTE = [
  "#7f1d1d",
  "#9a3412",
  "#b45309",
  "#3f6212",
  "#065f46",
  "#155e75",
  "#1e3a8a",
  "#5b21b6",
  "#831843",
  "#854d0e",
];

/** Deterministic decorative spines derived from the room id + book count. */
function miniSpines(seed: string, count: number) {
  const n = Math.min(Math.max(count, 0), 14);
  const spines = [];
  for (let i = 0; i < n; i++) {
    let h = 0;
    const s = `${seed}:${i}`;
    for (let j = 0; j < s.length; j++) h = (h * 31 + s.charCodeAt(j)) >>> 0;
    spines.push({
      color: SPINE_PALETTE[h % SPINE_PALETTE.length],
      height: 30 + (h % 30),
      width: 5 + (h % 5),
    });
  }
  return spines;
}

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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="text-2xl font-bold">🏠 Räume</h1>

      {roomList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Noch keine Räume.{" "}
          <Link href="/settings/rooms" className="text-foreground underline">
            Räume anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {roomList.map((room) => {
            const shelved = room.copies.filter((c) => c.compartmentId).length;
            const stacked = room.copies.length - shelved;
            const spines = miniSpines(room.id, room.copies.length);
            return (
              <Link key={room.id} href={`/rooms/${room.id}`} className="group block h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-foreground/5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-foreground/15">
                  {/* decorative shelf band */}
                  <div
                    className="relative h-24"
                    style={{
                      backgroundColor: "#b08968",
                      backgroundImage:
                        "linear-gradient(180deg, rgba(255,255,255,.18), rgba(0,0,0,.22)), repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 8px, rgba(255,255,255,.04) 8px 16px)",
                    }}
                  >
                    {spines.length > 0 ? (
                      <div className="absolute inset-x-4 bottom-[6px] flex items-end gap-[3px] overflow-hidden">
                        {spines.map((s, i) => (
                          <div
                            // eslint-disable-next-line react/no-array-index-key
                            key={i}
                            style={{
                              width: s.width,
                              height: s.height,
                              backgroundColor: s.color,
                              backgroundImage:
                                "linear-gradient(90deg, rgba(255,255,255,.28), rgba(0,0,0,.25))",
                            }}
                            className="shrink-0 rounded-t-[2px] shadow-[0_1px_2px_rgba(0,0,0,.4)]"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                        noch leer
                      </span>
                    )}
                    {/* shelf board */}
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/35" />
                  </div>

                  {/* body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h2 className="text-lg font-semibold leading-tight">
                      {room.name}
                    </h2>
                    <div className="mt-auto flex flex-wrap gap-1.5 text-xs">
                      <Stat icon="🪟" value={room.shelves.length} label="Möbel" />
                      <Stat icon="📗" value={shelved} label="eingeräumt" />
                      <Stat icon="📚" value={stacked} label="im Stapel" />
                    </div>
                  </div>
                </article>
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

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
      <span aria-hidden>{icon}</span>
      <span className="text-foreground">{value}</span>
      {label}
    </span>
  );
}
