import { isbn10to13, isValidIsbn, isValidIsbn13, normalizeIsbn } from "../isbn";
import { lookupDnb } from "./dnb";
import { lookupGoogle, searchGoogle } from "./google";
import { coverFromGoogleThumbnail } from "./google-thumb";
import { lookupOpenLibrary, searchOpenLibrary } from "./openlibrary";
import type { BookMetadata } from "./types";

export type { BookMetadata, MetadataSource } from "./types";

function firstStr(values: (string | null | undefined)[]): string | null {
  return values.find((v) => v != null && v !== "") ?? null;
}

function firstNum(values: (number | null | undefined)[]): number | null {
  return values.find((v) => v != null) ?? null;
}

function firstArr(values: (string[] | undefined)[]): string[] {
  return values.find((v) => v && v.length > 0) ?? [];
}

/**
 * Looks up a book by EAN/ISBN across all configured sources in parallel and
 * merges the results field-by-field. Returns null if nothing is found.
 */
export async function lookupByEan(
  rawEan: string,
): Promise<BookMetadata | null> {
  const isbn = normalizeIsbn(rawEan);
  if (!isValidIsbn(isbn)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let settled: PromiseSettledResult<BookMetadata | null>[];
  let googleThumb: string | null = null;
  try {
    const [dnbR, googleR, olR, thumbR] = await Promise.allSettled([
      lookupDnb(isbn, controller.signal),
      lookupGoogle(isbn, controller.signal),
      lookupOpenLibrary(isbn, controller.signal),
      coverFromGoogleThumbnail(isbn, controller.signal),
    ]);
    settled = [dnbR, googleR, olR];
    googleThumb = thumbR.status === "fulfilled" ? thumbR.value : null;
  } finally {
    clearTimeout(timeout);
  }

  const [dnb, google, ol] = settled.map((r) =>
    r.status === "fulfilled" ? r.value : null,
  );

  const present = [dnb, google, ol].filter(Boolean) as BookMetadata[];
  if (present.length === 0) return null;

  // Canonical EAN derived from the queried ISBN as a last-resort fallback.
  const canonicalEan = isValidIsbn13(isbn)
    ? isbn
    : isbn10to13(isbn);

  return {
    ean: firstStr([dnb?.ean, google?.ean, ol?.ean, canonicalEan]),
    isbn10: firstStr([
      dnb?.isbn10,
      google?.isbn10,
      ol?.isbn10,
      isbn.length === 10 ? isbn : null,
    ]),
    title: firstStr([dnb?.title, google?.title, ol?.title]) ?? "",
    subtitle: firstStr([dnb?.subtitle, google?.subtitle, ol?.subtitle]),
    authors: firstArr([dnb?.authors, google?.authors, ol?.authors]),
    publisher: firstStr([dnb?.publisher, google?.publisher, ol?.publisher]),
    publishedYear: firstNum([
      dnb?.publishedYear,
      google?.publishedYear,
      ol?.publishedYear,
    ]),
    pageCount: firstNum([dnb?.pageCount, google?.pageCount, ol?.pageCount]),
    language: firstStr([dnb?.language, google?.language, ol?.language]),
    // DNB rarely has these — prefer Google then Open Library.
    description: firstStr([google?.description, ol?.description, dnb?.description]),
    // Cover priority: keyed Google API → keyless Google thumbnail → Open Library.
    coverUrl: firstStr([
      google?.coverUrl,
      googleThumb,
      ol?.coverUrl,
      dnb?.coverUrl,
    ]),
    sources: present.flatMap((m) => m.sources),
  };
}

/**
 * Free-text search across sources (Google Books when a key is configured, plus
 * keyless Open Library). Results are merged and de-duplicated by title+author.
 */
export async function searchBooks(query: string): Promise<BookMetadata[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const [g, ol] = await Promise.allSettled([
      searchGoogle(q, controller.signal),
      searchOpenLibrary(q, controller.signal),
    ]);
    const google = g.status === "fulfilled" ? g.value : [];
    const openlib = ol.status === "fulfilled" ? ol.value : [];

    // Google first (richer metadata + covers), Open Library fills the rest.
    const seen = new Set<string>();
    const merged: BookMetadata[] = [];
    for (const m of [...google, ...openlib]) {
      const key = `${m.title.toLowerCase().trim()}|${(m.authors[0] ?? "").toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
    return merged.slice(0, 12);
  } finally {
    clearTimeout(timeout);
  }
}
