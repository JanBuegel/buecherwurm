"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { compartments, copies, shelves } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import {
  DEFAULT_FURNITURE_COLOR,
  type FurnitureKind,
  presetByKey,
} from "@/lib/furniture";

export type FurnitureFormState = { error?: string; ok?: boolean } | null;

function clampGrid(n: number, max: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), max);
}

export async function createFurnitureAction(
  _prev: FurnitureFormState,
  formData: FormData,
): Promise<FurnitureFormState> {
  await requireOwner();

  const roomId = String(formData.get("roomId") ?? "").trim();
  if (!roomId) return { error: "Raum fehlt." };

  const presetKey = String(formData.get("preset") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_FURNITURE_COLOR;

  let kind: FurnitureKind;
  let columns: number;
  let rows: number;

  if (presetKey === "custom") {
    kind = "custom";
    columns = clampGrid(Number(formData.get("columns")), 12);
    rows = clampGrid(Number(formData.get("rows")), 12);
  } else {
    const preset = presetByKey(presetKey);
    if (!preset) return { error: "Unbekannte Vorlage." };
    kind = preset.kind;
    columns = preset.columns;
    rows = preset.rows;
  }

  const [shelf] = await db
    .insert(shelves)
    .values({
      roomId,
      name: name || presetByKey(presetKey)?.label || "Möbel",
      kind,
      color,
      columns,
      rows,
    })
    .returning({ id: shelves.id });

  // Generate the compartment grid (top-left to bottom-right).
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      cells.push({
        shelfId: shelf.id,
        row,
        col,
        sortIndex: row * columns + col,
      });
    }
  }
  if (cells.length) await db.insert(compartments).values(cells);

  revalidatePath(`/rooms/${roomId}`);
  return { ok: true };
}

export async function updateFurnitureAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "");
  if (!id) return;
  const patch: { name?: string; color?: string } = {};
  if (name) patch.name = name;
  if (color) patch.color = color;
  if (Object.keys(patch).length) {
    await db.update(shelves).set(patch).where(eq(shelves.id, id));
    if (roomId) revalidatePath(`/rooms/${roomId}`);
  }
}

export async function deleteFurnitureAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  if (!id) return;
  // compartments cascade; copies.compartmentId is set null (books fall back to stack).
  await db.delete(shelves).where(eq(shelves.id, id));
  if (roomId) revalidatePath(`/rooms/${roomId}`);
}

/**
 * Moves a copy into a compartment (or back to a room's stack when
 * compartmentId is null). Appends to the end of the target.
 */
export async function placeCopyAction(
  copyId: string,
  compartmentId: string | null,
  roomId: string | null,
): Promise<void> {
  await requireOwner();
  if (!copyId) return;

  if (compartmentId) {
    const comp = await db.query.compartments.findFirst({
      where: eq(compartments.id, compartmentId),
      with: { shelf: { columns: { roomId: true } } },
    });
    if (!comp) return;
    const [row] = await db
      .select({ value: max(copies.position) })
      .from(copies)
      .where(eq(copies.compartmentId, compartmentId));
    await db
      .update(copies)
      .set({
        compartmentId,
        roomId: comp.shelf.roomId,
        position: (row?.value ?? 0) + 1,
      })
      .where(eq(copies.id, copyId));
    revalidatePath(`/rooms/${comp.shelf.roomId}`);
    return;
  }

  // Back to the room stack (no compartment).
  const stackWhere = roomId
    ? and(eq(copies.roomId, roomId), isNull(copies.compartmentId))
    : and(isNull(copies.roomId), isNull(copies.compartmentId));
  const [row] = await db
    .select({ value: max(copies.position) })
    .from(copies)
    .where(stackWhere);
  await db
    .update(copies)
    .set({ compartmentId: null, roomId, position: (row?.value ?? 0) + 1 })
    .where(eq(copies.id, copyId));
  if (roomId) revalidatePath(`/rooms/${roomId}`);
}
