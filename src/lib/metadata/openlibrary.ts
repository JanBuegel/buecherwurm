import { isValidIsbn13, normalizeIsbn } from "../isbn";
import type { BookMetadata } from "./types";

type OlAuthor = { name?: string };
type OlNamed = { name?: string };
type OlBook = {
  title?: string;
  subtitle?: string;
  authors?: OlAuthor[];
  publishers?: OlNamed[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { large?: string; medium?: string; small?: string };
};

export async function lookupOpenLibrary(
  isbn: string,
  signal?: AbortSignal,
): Promise<BookMetadata | null> {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(
    key,
  )}&format=json&jscmd=data`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, OlBook>;
  const book = json[key];
  if (!book?.title) return null;

  const yearMatch = book.publish_date?.match(/\d{4}/);
  const normalized = normalizeIsbn(isbn);

  return {
    ean: isValidIsbn13(normalized) ? normalized : null,
    isbn10: normalized.length === 10 ? normalized : null,
    title: book.title,
    subtitle: book.subtitle ?? null,
    authors: (book.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
    publisher: book.publishers?.[0]?.name ?? null,
    publishedYear: yearMatch ? Number(yearMatch[0]) : null,
    pageCount: book.number_of_pages ?? null,
    language: null,
    description: null,
    coverUrl: book.cover?.large ?? book.cover?.medium ?? null,
    sources: ["openlibrary"],
  };
}
