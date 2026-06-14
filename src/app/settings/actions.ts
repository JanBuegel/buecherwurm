"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  books,
  copies,
  copyTags,
  persons,
  rooms,
  tags,
  users,
} from "@/db/schema";
import { requireOwner, requireUser } from "@/lib/auth-helpers";
import { CSV_HEADER } from "@/lib/book-csv";
import { parseCsv } from "@/lib/csv";
import { normalizeIsbn } from "@/lib/isbn";
import { hashPassword, verifyPassword } from "@/lib/password";

export type FormState = {
  error?: string;
  ok?: boolean;
  message?: string;
} | null;

/* ----------------------------------------------------------------- rooms --- */

export async function createRoomAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name ist erforderlich." };
  await db.insert(rooms).values({ name });
  revalidatePath("/settings/rooms");
  return { ok: true };
}

export async function renameRoomAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (id && name) {
    await db.update(rooms).set({ name }).where(eq(rooms.id, id));
    revalidatePath("/settings/rooms");
  }
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (id) {
    // copies.roomId is set null; shelves (furniture) cascade-delete.
    await db.delete(rooms).where(eq(rooms.id, id));
    revalidatePath("/settings/rooms");
  }
}

/* --------------------------------------------------------------- persons --- */

export async function createPersonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name ist erforderlich." };
  await db.insert(persons).values({ name });
  revalidatePath("/settings/persons");
  return { ok: true };
}

export async function renamePersonAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (id && name) {
    await db.update(persons).set({ name }).where(eq(persons.id, id));
    revalidatePath("/settings/persons");
  }
}

export async function deletePersonAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Guard: never delete a person who still owns copies (FK is restrict anyway).
  const owned = await db.query.copies.findFirst({
    where: eq(copies.ownerId, id),
    columns: { id: true },
  });
  if (owned) return;
  await db.delete(persons).where(eq(persons.id, id));
  revalidatePath("/settings/persons");
}

/* ----------------------------------------------------------------- users --- */

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "viewer");
  const role = roleRaw === "owner" ? "owner" : "viewer";
  const linkPersonId = String(formData.get("linkPersonId") ?? "").trim();

  if (!name || !email || !password) {
    return { error: "Name, E-Mail und Passwort sind erforderlich." };
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return { error: "Diese E-Mail ist bereits vergeben." };

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning({ id: users.id });

  if (linkPersonId && linkPersonId !== "none") {
    await db
      .update(persons)
      .set({ userId: user.id })
      .where(eq(persons.id, linkPersonId));
  }

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function updateUserAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const roleRaw = String(formData.get("role") ?? "viewer");
  const role = roleRaw === "owner" ? "owner" : "viewer";
  if (!id || !name || !email) return;

  // Don't allow demoting the last remaining owner.
  if (role !== "owner") {
    const current = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (current?.role === "owner") {
      const otherOwner = await db.query.users.findFirst({
        where: and(eq(users.role, "owner"), ne(users.id, id)),
        columns: { id: true },
      });
      if (!otherOwner) return; // would remove the last owner
    }
  }

  await db.update(users).set({ name, email, role }).where(eq(users.id, id));
  revalidatePath("/settings/users");
}

export async function setUserPasswordAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 4) return;
  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  revalidatePath("/settings/users");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // can't delete yourself

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return;
  if (target.role === "owner") {
    const otherOwner = await db.query.users.findFirst({
      where: and(eq(users.role, "owner"), ne(users.id, id)),
      columns: { id: true },
    });
    if (!otherOwner) return; // last owner
  }
  // persons.userId is set null automatically (onDelete: set null).
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/settings/users");
}

/* ------------------------------------------------------------------ tags --- */

export async function createTagAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  if (!name) return { error: "Name ist erforderlich." };
  const existing = await db.query.tags.findFirst({ where: eq(tags.name, name) });
  if (existing) return { error: "Dieser Tag existiert bereits." };
  await db.insert(tags).values({ name, color });
  revalidatePath("/settings/tags");
  return { ok: true };
}

export async function setTagColorAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const color = String(formData.get("color") ?? "").trim() || null;
  if (id) {
    await db.update(tags).set({ color }).where(eq(tags.id, id));
    revalidatePath("/settings/tags");
    revalidatePath("/books");
    revalidatePath("/rooms", "layout"); // shelf tag stickers use the colour
  }
}

/**
 * Renames a tag. If the new name already exists on another tag, the two are
 * merged: all links are moved to the surviving tag and the renamed one removed.
 */
export async function renameTagAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const target = await db.query.tags.findFirst({ where: eq(tags.name, name) });
  if (target && target.id !== id) {
    // Merge `id` into `target`: repoint links, drop duplicates, delete `id`.
    const links = await db.query.copyTags.findMany({
      where: eq(copyTags.tagId, id),
    });
    for (const link of links) {
      await db
        .insert(copyTags)
        .values({ copyId: link.copyId, tagId: target.id })
        .onConflictDoNothing();
    }
    await db.delete(copyTags).where(eq(copyTags.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));
  } else {
    await db.update(tags).set({ name }).where(eq(tags.id, id));
  }
  revalidatePath("/settings/tags");
  revalidatePath("/books");
  revalidatePath("/rooms", "layout");
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db.delete(tags).where(eq(tags.id, id)); // copyTags cascade
    revalidatePath("/settings/tags");
    revalidatePath("/books");
    revalidatePath("/rooms", "layout");
  }
}

/* --------------------------------------------------------------- profile --- */

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name ist erforderlich." };
  await db.update(users).set({ name }).where(eq(users.id, me.id));
  revalidatePath("/settings/profile");
  return { ok: true };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 4) {
    return { error: "Neues Passwort muss mindestens 4 Zeichen haben." };
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, me.id) });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Aktuelles Passwort ist falsch." };
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, me.id));
  return { ok: true };
}

/* ---------------------------------------------------------- csv import --- */

type CopyStatus = "available" | "reading" | "read" | "lent";

export async function importCsvAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine CSV-Datei auswählen." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "Die CSV enthält keine Datenzeilen." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const name of CSV_HEADER) idx[name] = header.indexOf(name);
  if (idx.title < 0) return { error: "Spalte 'title' fehlt im Header." };

  const get = (row: string[], name: string) => {
    const i = idx[name];
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };
  const splitMulti = (v: string) =>
    v
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
  const parseStatus = (v: string): CopyStatus =>
    (["available", "reading", "read", "lent"].includes(v)
      ? v
      : "available") as CopyStatus;
  const parsePriceCents = (v: string) => {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };
  const parseIntOrNull = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const personCache = new Map<string, string>();
  const roomCache = new Map<string, string>();
  const tagCache = new Map<string, string>();

  const getPerson = async (name: string) => {
    const key = name.toLowerCase();
    const hit = personCache.get(key);
    if (hit) return hit;
    let p = await db.query.persons.findFirst({ where: eq(persons.name, name) });
    if (!p) [p] = await db.insert(persons).values({ name }).returning();
    personCache.set(key, p.id);
    return p.id;
  };
  const getRoom = async (name: string) => {
    const key = name.toLowerCase();
    const hit = roomCache.get(key);
    if (hit) return hit;
    let r = await db.query.rooms.findFirst({ where: eq(rooms.name, name) });
    if (!r) [r] = await db.insert(rooms).values({ name }).returning();
    roomCache.set(key, r.id);
    return r.id;
  };
  const getTag = async (name: string) => {
    const key = name.toLowerCase();
    const hit = tagCache.get(key);
    if (hit) return hit;
    let t = await db.query.tags.findFirst({ where: eq(tags.name, name) });
    if (!t) [t] = await db.insert(tags).values({ name }).returning();
    tagCache.set(key, t.id);
    return t.id;
  };

  let imported = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = get(row, "title");
    if (!title) continue;

    const ownerId = await getPerson(get(row, "owner") || "Unbekannt");
    const roomName = get(row, "room");
    const roomId = roomName ? await getRoom(roomName) : null;
    const rawEan = get(row, "ean");
    const ean = rawEan ? normalizeIsbn(rawEan) : null;

    let bookId: string;
    const existing = ean
      ? await db.query.books.findFirst({ where: eq(books.ean, ean) })
      : null;
    if (existing) {
      bookId = existing.id;
    } else {
      const authors = splitMulti(get(row, "authors"));
      const [book] = await db
        .insert(books)
        .values({
          ean,
          title,
          subtitle: get(row, "subtitle") || null,
          authors: authors.length ? authors : null,
          publisher: get(row, "publisher") || null,
          publishedYear: parseIntOrNull(get(row, "publishedYear")),
          pageCount: parseIntOrNull(get(row, "pageCount")),
          language: get(row, "language") || null,
          coverUrl: get(row, "coverUrl") || null,
          metadataSource: "import",
        })
        .returning({ id: books.id });
      bookId = book.id;
    }

    const [copy] = await db
      .insert(copies)
      .values({
        bookId,
        ownerId,
        roomId,
        status: parseStatus(get(row, "status")),
        condition: get(row, "condition") || null,
        purchasePriceCents: parsePriceCents(get(row, "purchasePrice")),
        notes: get(row, "notes") || null,
      })
      .returning({ id: copies.id });

    for (const tagName of splitMulti(get(row, "tags"))) {
      const tagId = await getTag(tagName);
      await db
        .insert(copyTags)
        .values({ copyId: copy.id, tagId })
        .onConflictDoNothing();
    }
    imported++;
  }

  revalidatePath("/books");
  return { ok: true, message: `${imported} Exemplare importiert.` };
}
