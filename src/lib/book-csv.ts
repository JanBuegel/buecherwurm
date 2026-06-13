/** Column order shared by CSV export and import. */
export const CSV_HEADER = [
  "ean",
  "title",
  "subtitle",
  "authors",
  "publisher",
  "publishedYear",
  "pageCount",
  "language",
  "owner",
  "room",
  "status",
  "condition",
  "purchasePrice",
  "tags",
  "notes",
  "coverUrl",
] as const;

export const MULTI_VALUE_SEPARATOR = ";";
