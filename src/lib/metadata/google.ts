import { isValidIsbn13, normalizeIsbn } from "../isbn";
import type { BookMetadata } from "./types";

type GoogleVolumeInfo = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
};

/**
 * Google Books requires an API key for reliable use — the anonymous quota is
 * shared per-IP and returns 429 quickly. Skipped entirely if no key is set.
 */
export async function lookupGoogle(
  isbn: string,
  signal?: AbortSignal,
): Promise<BookMetadata | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;

  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
      isbn,
    )}&key=${apiKey}`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: { volumeInfo?: GoogleVolumeInfo }[];
  };
  const info = json.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  return parseVolume(info, isbn);
}

/** Free-text search (title/author/…); returns up to `limit` candidates. */
export async function searchGoogle(
  query: string,
  signal?: AbortSignal,
  limit = 10,
): Promise<BookMetadata[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return [];

  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query,
    )}&maxResults=${limit}&key=${apiKey}`;

  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: { volumeInfo?: GoogleVolumeInfo }[];
  };
  return (json.items ?? [])
    .map((it) => it.volumeInfo)
    .filter((i): i is GoogleVolumeInfo => Boolean(i?.title))
    .map((info) => parseVolume(info));
}

/** Maps a Google volumeInfo to our shared metadata shape. */
function parseVolume(
  info: GoogleVolumeInfo,
  queriedIsbn?: string,
): BookMetadata {
  const ids = info.industryIdentifiers ?? [];
  const ean = ids.find((i) => i.type === "ISBN_13")?.identifier ?? null;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier ?? null;
  const yearMatch = info.publishedDate?.match(/\d{4}/);

  // Google thumbnails come over http with a zoom/curl param — clean them up.
  const cover = info.imageLinks?.thumbnail
    ?.replace(/^http:/, "https:")
    .replace(/&edge=curl/, "");

  const normalized = queriedIsbn ? normalizeIsbn(queriedIsbn) : "";

  return {
    ean: ean ?? (isValidIsbn13(normalized) ? normalized : null),
    isbn10,
    title: info.title ?? "",
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    publishedYear: yearMatch ? Number(yearMatch[0]) : null,
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    description: info.description ?? null,
    coverUrl: cover ?? null,
    sources: ["google"],
  };
}
