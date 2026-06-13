export type MetadataSource = "dnb" | "google" | "openlibrary";

export type BookMetadata = {
  ean: string | null; // ISBN-13
  isbn10: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  language: string | null;
  description: string | null;
  coverUrl: string | null;
  /** Which source(s) contributed to this record. */
  sources: MetadataSource[];
};
