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
/* Login accounts. role controls app access; ownership lives on `persons`.    */

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // "owner" can manage; "viewer" has read-only access.
  role: text("role", { enum: ["owner", "viewer"] })
    .notNull()
    .default("viewer"),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------- persons --- */
/* A person who can own books. Decoupled from login accounts: a person may    */
/* optionally be linked to a user, but owners need not have an account.       */

export const persons = sqliteTable("persons", {
  id: id(),
  name: text("name").notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" })
    .unique(),
  createdAt: createdAt(),
});

/* ----------------------------------------------------------------- rooms --- */

export const rooms = sqliteTable("rooms", {
  id: id(),
  name: text("name").notNull(),
  sortIndex: real("sort_index").notNull().default(0),
  createdAt: createdAt(),
});

/* --------------------------------------------------------------- shelves --- */
/* A piece of furniture in a room (KALLAX, IVAR, …). Its grid of compartments  */
/* holds the books. The fancy editor/renderer arrives in a later phase.        */

export const shelves = sqliteTable(
  "shelves",
  {
    id: id(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // "kallax" | "ivar" | "billy" | "custom"
    kind: text("kind"),
    color: text("color"),
    // Overall grid hint; `compartments` hold the authoritative structure.
    columns: integer("columns"),
    rows: integer("rows"),
    sortIndex: real("sort_index").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("shelves_room_idx").on(t.roomId)],
);

/* ---------------------------------------------------------- compartments --- */
/* A single slot (Fach) within a piece of furniture. Books live here.         */

export const compartments = sqliteTable(
  "compartments",
  {
    id: id(),
    shelfId: text("shelf_id")
      .notNull()
      .references(() => shelves.id, { onDelete: "cascade" }),
    row: integer("row").notNull().default(0),
    col: integer("col").notNull().default(0),
    // Optional per-compartment sizing for non-uniform furniture (e.g. IVAR).
    widthUnits: real("width_units"),
    heightUnits: real("height_units"),
    label: text("label"),
    sortIndex: real("sort_index").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("compartments_shelf_idx").on(t.shelfId)],
);

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

/* -------------------------------------------------------------- copies --- */
/* A physical copy owned by a person, located in a room and optionally        */
/* placed in a specific compartment. No compartment = sits in the room stack. */

export const copies = sqliteTable(
  "copies",
  {
    id: id(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => persons.id, { onDelete: "restrict" }),
    roomId: text("room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    compartmentId: text("compartment_id").references(() => compartments.id, {
      onDelete: "set null",
    }),
    // Fractional position for drag & drop ordering within a compartment/stack.
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
    // Spine colour in the bookshelf render (hex). Derived from cover or chosen.
    spineColor: text("spine_color"),
    createdAt: createdAt(),
  },
  (t) => [
    index("copies_book_idx").on(t.bookId),
    index("copies_owner_idx").on(t.ownerId),
    index("copies_room_idx").on(t.roomId),
    index("copies_compartment_idx").on(t.compartmentId),
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

export const usersRelations = relations(users, ({ one }) => ({
  person: one(persons),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  user: one(users, { fields: [persons.userId], references: [users.id] }),
  copies: many(copies),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  shelves: many(shelves),
  copies: many(copies),
}));

export const shelvesRelations = relations(shelves, ({ one, many }) => ({
  room: one(rooms, { fields: [shelves.roomId], references: [rooms.id] }),
  compartments: many(compartments),
}));

export const compartmentsRelations = relations(
  compartments,
  ({ one, many }) => ({
    shelf: one(shelves, {
      fields: [compartments.shelfId],
      references: [shelves.id],
    }),
    copies: many(copies),
  }),
);

export const booksRelations = relations(books, ({ many }) => ({
  copies: many(copies),
}));

export const copiesRelations = relations(copies, ({ one, many }) => ({
  book: one(books, { fields: [copies.bookId], references: [books.id] }),
  owner: one(persons, { fields: [copies.ownerId], references: [persons.id] }),
  room: one(rooms, { fields: [copies.roomId], references: [rooms.id] }),
  compartment: one(compartments, {
    fields: [copies.compartmentId],
    references: [compartments.id],
  }),
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
export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Shelf = typeof shelves.$inferSelect;
export type NewShelf = typeof shelves.$inferInsert;
export type Compartment = typeof compartments.$inferSelect;
export type NewCompartment = typeof compartments.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Copy = typeof copies.$inferSelect;
export type NewCopy = typeof copies.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Loan = typeof loans.$inferSelect;
