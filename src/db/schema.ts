import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

/* ---------------------------------------------------------------- users --- */

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // "owner" can manage their books; "viewer" has read-only access.
  role: text("role", { enum: ["owner", "viewer"] })
    .notNull()
    .default("viewer"),
  createdAt: createdAt(),
});

/* ---------------------------------------------------------------- books --- */
/* Bibliographic record — one per title/edition, deduplicated by EAN.        */

export const books = sqliteTable(
  "books",
  {
    id: id(),
    ean: text("ean"), // ISBN-13 / barcode; unique when present
    isbn10: text("isbn10"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    authors: text("authors", { mode: "json" }).$type<string[]>(),
    publisher: text("publisher"),
    publishedYear: integer("published_year"),
    pageCount: integer("page_count"),
    language: text("language"),
    description: text("description"),
    coverUrl: text("cover_url"),
    // Where the metadata came from: "dnb" | "google" | "openlibrary" | "manual"
    metadataSource: text("metadata_source"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("books_ean_unq").on(t.ean)],
);

/* --------------------------------------------------------------- shelves --- */
/* A physical shelf — the unit rendered in the bookshelf view.               */

export const shelves = sqliteTable("shelves", {
  id: id(),
  name: text("name").notNull(),
  room: text("room"),
  sortIndex: real("sort_index").notNull().default(0),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------- copies --- */
/* A physical copy that someone owns and shelves somewhere.                  */

export const copies = sqliteTable(
  "copies",
  {
    id: id(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    shelfId: text("shelf_id").references(() => shelves.id, {
      onDelete: "set null",
    }),
    // Fractional position to allow drag & drop reordering within a shelf.
    position: real("position").notNull().default(0),
    // "new" | "good" | "worn"
    condition: text("condition"),
    // "available" | "reading" | "read" | "lent"
    status: text("status", {
      enum: ["available", "reading", "read", "lent"],
    })
      .notNull()
      .default("available"),
    purchasePriceCents: integer("purchase_price_cents"),
    purchaseDate: integer("purchase_date", { mode: "timestamp" }),
    notes: text("notes"),
    // Colour of the spine in the bookshelf render (hex). Derived from cover
    // or chosen manually.
    spineColor: text("spine_color"),
    createdAt: createdAt(),
  },
  (t) => [
    index("copies_book_idx").on(t.bookId),
    index("copies_owner_idx").on(t.ownerId),
    index("copies_shelf_idx").on(t.shelfId),
  ],
);

/* ---------------------------------------------------------------- tags --- */

export const tags = sqliteTable("tags", {
  id: id(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: createdAt(),
});

export const copyTags = sqliteTable(
  "copy_tags",
  {
    copyId: text("copy_id")
      .notNull()
      .references(() => copies.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.copyId, t.tagId] })],
);

/* ---------------------------------------------------------------- loans --- */
/* Lending history for a copy (Phase 5 feature, modelled up front).          */

export const loans = sqliteTable(
  "loans",
  {
    id: id(),
    copyId: text("copy_id")
      .notNull()
      .references(() => copies.id, { onDelete: "cascade" }),
    borrowerName: text("borrower_name").notNull(),
    lentAt: integer("lent_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    dueAt: integer("due_at", { mode: "timestamp" }),
    returnedAt: integer("returned_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [index("loans_copy_idx").on(t.copyId)],
);

/* ------------------------------------------------------------ relations --- */

export const usersRelations = relations(users, ({ many }) => ({
  copies: many(copies),
}));

export const booksRelations = relations(books, ({ many }) => ({
  copies: many(copies),
}));

export const shelvesRelations = relations(shelves, ({ many }) => ({
  copies: many(copies),
}));

export const copiesRelations = relations(copies, ({ one, many }) => ({
  book: one(books, { fields: [copies.bookId], references: [books.id] }),
  owner: one(users, { fields: [copies.ownerId], references: [users.id] }),
  shelf: one(shelves, { fields: [copies.shelfId], references: [shelves.id] }),
  copyTags: many(copyTags),
  loans: many(loans),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  copyTags: many(copyTags),
}));

export const copyTagsRelations = relations(copyTags, ({ one }) => ({
  copy: one(copies, { fields: [copyTags.copyId], references: [copies.id] }),
  tag: one(tags, { fields: [copyTags.tagId], references: [tags.id] }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  copy: one(copies, { fields: [loans.copyId], references: [copies.id] }),
}));

/* ---------------------------------------------------------------- types --- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Shelf = typeof shelves.$inferSelect;
export type NewShelf = typeof shelves.$inferInsert;
export type Copy = typeof copies.$inferSelect;
export type NewCopy = typeof copies.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Loan = typeof loans.$inferSelect;
