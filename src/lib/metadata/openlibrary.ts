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

// MARC language codes → our short codes (best-effort; language is optional).
const OL_LANG: Record<string, string> = {
  ger: "de",
  eng: "en",
  fre: "fr",
  spa: "es",
  ita: "it",
  dut: "nl",
};

type OlDoc = {
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
  language?: string[];
};

/** Free-text search; returns up to `limit` candidates. Keyless. */
export async function searchOpenLibrary(
  query: string,
  signal?: AbortSignal,
  limit = 10,
): Promise<BookMetadata[]> {
  const fields =
    "title,subtitle,author_name,first_publish_year,publisher,number_of_pages_median,isbn,cover_i,language";
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(
      query,
    )}&limit=${limit}&fields=${fields}`;

  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { docs?: OlDoc[] };

  return (json.docs ?? [])
    .filter((d) => d.title)
    .map((d): BookMetadata => {
      const isbns = d.isbn ?? [];
      const lang = d.language?.[0];
      return {
        ean: isbns.find((i) => i.length === 13) ?? null,
        isbn10: isbns.find((i) => i.length === 10) ?? null,
        title: d.title as string,
        subtitle: d.subtitle ?? null,
        authors: d.author_name ?? [],
        publisher: d.publisher?.[0] ?? null,
        publishedYear: d.first_publish_year ?? null,
        pageCount: d.number_of_pages_median ?? null,
        language: lang ? (OL_LANG[lang] ?? lang) : null,
        description: null,
        coverUrl: d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : null,
        sources: ["openlibrary"],
      };
    });
}
