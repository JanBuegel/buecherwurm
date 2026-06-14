"use server";

import { and, count, eq, inArray, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { books, copies, copyTags, tags } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import { saveCoverFile } from "@/lib/covers";
import { normalizeIsbn } from "@/lib/isbn";
import { type BookMetadata, lookupByEan, searchBooks } from "@/lib/metadata";

/** Resolves the cover URL: an uploaded file wins over the text URL field. */
async function resolveCoverUrl(formData: FormData): Promise<string | null> {
  const file = formData.get("coverFile");
  if (file instanceof File && file.size > 0) {
    const saved = await saveCoverFile(file);
    if (saved) return saved;
  }
  return String(formData.get("coverUrl") ?? "").trim() || null;
}

/* --------------------------------------------------------------- lookup --- */

export type LookupResult =
  | { status: "empty" }
  | { status: "notfound"; ean: string }
  | { status: "found"; meta: BookMetadata };

/** Called directly from the client to prefill the capture form. */
export async function lookupBookAction(ean: string): Promise<LookupResult> {
  await requireOwner();
  if (!ean.trim()) return { status: "empty" };
  const meta = await lookupByEan(ean);
  if (!meta) return { status: "notfound", ean: normalizeIsbn(ean) };
  return { status: "found", meta };
}

/** Free-text search (title/author/…) for the capture form. */
export async function searchBooksAction(
  query: string,
): Promise<BookMetadata[]> {
  await requireOwner();
  if (!query.trim()) return [];
  return searchBooks(query);
}

/* ----------------------------------------------------------- createCopy --- */

export type CreateState =
  | {
      error?: string;
      duplicate?: { title: string; count: number };
    }
  | null;

function parseList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntOrNull(raw: FormDataEntryValue | null): number | null {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Parses a "8,99" / "8.99" euro string into integer cents. */
function parsePriceCents(raw: FormDataEntryValue | null): number | null {
  const str = String(raw ?? "")
    .trim()
    .replace(",", ".");
  if (!str) return null;
  const euros = Number.parseFloat(str);
  return Number.isFinite(euros) ? Math.round(euros * 100) : null;
}

async function nextPosition(roomId: string | null): Promise<number> {
  const [row] = await db
    .select({ value: max(copies.position) })
    .from(copies)
    .where(roomId ? eq(copies.roomId, roomId) : undefined);
  return (row?.value ?? 0) + 1;
}

/** Finds existing tag by name (case-insensitive) or creates it; returns id. */
async function upsertTag(name: string): Promise<string> {
  const existing = await db.query.tags.findFirst({
    where: eq(tags.name, name),
  });
  if (existing) return existing.id;
  const [created] = await db
    .insert(tags)
    .values({ name })
    .returning({ id: tags.id });
  return created.id;
}

export async function createCopyAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  await requireOwner();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel ist erforderlich." };

  const ownerId = String(formData.get("ownerId") ?? "").trim();
  if (!ownerId) return { error: "Inhaber ist erforderlich." };

  const rawEan = String(formData.get("ean") ?? "").trim();
  const ean = rawEan ? normalizeIsbn(rawEan) : null;

  const roomIdRaw = String(formData.get("roomId") ?? "").trim();
  const roomId = roomIdRaw && roomIdRaw !== "none" ? roomIdRaw : null;

  const statusRaw = String(formData.get("status") ?? "available").trim();
  const status = (
    ["available", "reading", "read", "lent"].includes(statusRaw)
      ? statusRaw
      : "available"
  ) as "available" | "reading" | "read" | "lent";

  // --- find or create the bibliographic book record (dedupe by EAN) ---
  let bookId: string;
  const existingBook = ean
    ? await db.query.books.findFirst({ where: eq(books.ean, ean) })
    : null;

  // --- warn before adding a duplicate (same EAN, or same title when no EAN) ---
  // The client can re-submit with `confirmDuplicate=1` to proceed anyway.
  const confirmed =
    String(formData.get("confirmDuplicate") ?? "").trim() === "1";
  if (!confirmed) {
    const dupBook =
      existingBook ??
      (await db.query.books.findFirst({
        where: sql`lower(${books.title}) = ${title.toLowerCase()}`,
      }));
    if (dupBook) {
      const [row] = await db
        .select({ value: count() })
        .from(copies)
        .where(eq(copies.bookId, dupBook.id));
      if ((row?.value ?? 0) > 0) {
        return { duplicate: { title: dupBook.title, count: row.value } };
      }
    }
  }

  if (existingBook) {
    bookId = existingBook.id;
  } else {
    const authors = parseList(formData.get("authors"));
    const coverUrl = await resolveCoverUrl(formData);
    const [book] = await db
      .insert(books)
      .values({
        ean,
        isbn10: String(formData.get("isbn10") ?? "").trim() || null,
        title,
        subtitle: String(formData.get("subtitle") ?? "").trim() || null,
        authors: authors.length ? authors : null,
        publisher: String(formData.get("publisher") ?? "").trim() || null,
        publishedYear: parseIntOrNull(formData.get("publishedYear")),
        pageCount: parseIntOrNull(formData.get("pageCount")),
        language: String(formData.get("language") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        coverUrl,
        metadataSource:
          String(formData.get("metadataSource") ?? "").trim() || "manual",
      })
      .returning({ id: books.id });
    bookId = book.id;
  }

  // --- create the physical copy ---
  const [copy] = await db
    .insert(copies)
    .values({
      bookId,
      ownerId,
      roomId,
      position: await nextPosition(roomId),
      condition: String(formData.get("condition") ?? "").trim() || null,
      status,
      purchasePriceCents: parsePriceCents(formData.get("purchasePrice")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      spineColor: String(formData.get("spineColor") ?? "").trim() || null,
    })
    .returning({ id: copies.id });

  // --- tags ---
  const tagNames = [...new Set(parseList(formData.get("tags")))];
  for (const name of tagNames) {
    const tagId = await upsertTag(name);
    await db
      .insert(copyTags)
      .values({ copyId: copy.id, tagId })
      .onConflictDoNothing();
  }

  revalidatePath("/books");
  redirect("/books");
}

/* ----------------------------------------------------------- updateCopy --- */

async function setCopyTags(copyId: string, names: string[]) {
  await db.delete(copyTags).where(eq(copyTags.copyId, copyId));
  for (const name of [...new Set(names)]) {
    const tagId = await upsertTag(name);
    await db
      .insert(copyTags)
      .values({ copyId, tagId })
      .onConflictDoNothing();
  }
}

export async function updateCopyAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  await requireOwner();

  const copyId = String(formData.get("copyId") ?? "").trim();
  if (!copyId) return { error: "Exemplar nicht gefunden." };

  const copy = await db.query.copies.findFirst({
    where: eq(copies.id, copyId),
  });
  if (!copy) return { error: "Exemplar nicht gefunden." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel ist erforderlich." };

  const ownerId = String(formData.get("ownerId") ?? "").trim();
  if (!ownerId) return { error: "Inhaber ist erforderlich." };

  const rawEan = String(formData.get("ean") ?? "").trim();
  const ean = rawEan ? normalizeIsbn(rawEan) : null;

  const roomIdRaw = String(formData.get("roomId") ?? "").trim();
  const roomId = roomIdRaw && roomIdRaw !== "none" ? roomIdRaw : null;

  const statusRaw = String(formData.get("status") ?? "available").trim();
  const status = (
    ["available", "reading", "read", "lent"].includes(statusRaw)
      ? statusRaw
      : "available"
  ) as "available" | "reading" | "read" | "lent";

  const authors = parseList(formData.get("authors"));
  const coverUrl = await resolveCoverUrl(formData);

  // The bibliographic record is shared across copies — updating it here updates
  // it for every copy of the title.
  try {
    await db
      .update(books)
      .set({
        ean,
        isbn10: String(formData.get("isbn10") ?? "").trim() || null,
        title,
        subtitle: String(formData.get("subtitle") ?? "").trim() || null,
        authors: authors.length ? authors : null,
        publisher: String(formData.get("publisher") ?? "").trim() || null,
        publishedYear: parseIntOrNull(formData.get("publishedYear")),
        pageCount: parseIntOrNull(formData.get("pageCount")),
        language: String(formData.get("language") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        coverUrl,
      })
      .where(eq(books.id, copy.bookId));
  } catch {
    return { error: "EAN ist bereits einem anderen Buch zugeordnet." };
  }

  await db
    .update(copies)
    .set({
      ownerId,
      roomId,
      condition: String(formData.get("condition") ?? "").trim() || null,
      status,
      purchasePriceCents: parsePriceCents(formData.get("purchasePrice")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      spineColor: String(formData.get("spineColor") ?? "").trim() || null,
    })
    .where(eq(copies.id, copyId));

  await setCopyTags(copyId, parseList(formData.get("tags")));

  revalidatePath("/books");
  revalidatePath(`/books/${copyId}`);
  redirect(`/books/${copyId}`);
}

/* ---------------------------------------------------------- batchEdit --- */

function cleanIds(values: string[]): string[] {
  return [...new Set(values.map((s) => s.trim()).filter(Boolean))];
}

/** Adds one or more tags to many copies at once (existing tags are kept). */
export async function addTagsToCopiesAction(
  copyIds: string[],
  tagNames: string[],
): Promise<void> {
  await requireOwner();
  const ids = cleanIds(copyIds);
  const names = cleanIds(tagNames);
  if (!ids.length || !names.length) return;

  const tagIds = await Promise.all(names.map((name) => upsertTag(name)));
  for (const copyId of ids) {
    for (const tagId of tagIds) {
      await db
        .insert(copyTags)
        .values({ copyId, tagId })
        .onConflictDoNothing();
    }
  }

  revalidatePath("/books");
  revalidatePath("/rooms", "layout"); // shelves show compartment tags
}

/** Removes the named tags from many copies at once. */
export async function removeTagsFromCopiesAction(
  copyIds: string[],
  tagNames: string[],
): Promise<void> {
  await requireOwner();
  const ids = cleanIds(copyIds);
  const names = cleanIds(tagNames);
  if (!ids.length || !names.length) return;

  const tagRows = await db.query.tags.findMany({
    where: inArray(tags.name, names),
    columns: { id: true },
  });
  const tagIds = tagRows.map((t) => t.id);
  if (!tagIds.length) return;

  await db
    .delete(copyTags)
    .where(
      and(inArray(copyTags.copyId, ids), inArray(copyTags.tagId, tagIds)),
    );

  revalidatePath("/books");
  revalidatePath("/rooms", "layout");
}

/** Reassigns the owner of many copies at once. */
export async function setOwnerForCopiesAction(
  copyIds: string[],
  ownerId: string,
): Promise<void> {
  await requireOwner();
  const ids = cleanIds(copyIds);
  const owner = ownerId.trim();
  if (!ids.length || !owner) return;

  await db
    .update(copies)
    .set({ ownerId: owner })
    .where(inArray(copies.id, ids));

  revalidatePath("/books");
}

/** Moves many copies to a room (or to the stack when null). Clears the shelf
 *  slot, so moved books land in the target room's intake stack. */
export async function setRoomForCopiesAction(
  copyIds: string[],
  roomId: string | null,
): Promise<void> {
  await requireOwner();
  const ids = cleanIds(copyIds);
  if (!ids.length) return;
  const room = roomId && roomId.trim() && roomId !== "none" ? roomId.trim() : null;

  await db
    .update(copies)
    .set({ roomId: room, compartmentId: null })
    .where(inArray(copies.id, ids));

  revalidatePath("/books");
  revalidatePath("/rooms", "layout");
}

/* ----------------------------------------------------------- deleteCopy --- */

export async function deleteCopyAction(formData: FormData): Promise<void> {
  await requireOwner();

  const copyId = String(formData.get("copyId") ?? "").trim();
  if (!copyId) return;

  const copy = await db.query.copies.findFirst({
    where: eq(copies.id, copyId),
  });
  if (!copy) return;

  await db.delete(copies).where(eq(copies.id, copyId));

  // Clean up the bibliographic record if no copies reference it anymore.
  const orphan = await db.query.copies.findFirst({
    where: eq(copies.bookId, copy.bookId),
    columns: { id: true },
  });
  if (!orphan) {
    await db.delete(books).where(eq(books.id, copy.bookId));
  }

  revalidatePath("/books");
  redirect("/books");
}
