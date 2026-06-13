/**
 * Cover via Google Books "Dynamic Links" (jscmd=viewapi). Unlike the Volumes
 * API this needs no key and isn't aggressively rate-limited, making it a
 * reliable cover source for mainstream (incl. German) titles. Returns the
 * cover URL or null.
 */
export async function coverFromGoogleThumbnail(
  isbn: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `https://books.google.com/books?bibkeys=ISBN:${encodeURIComponent(
    isbn,
  )}&jscmd=viewapi`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const text = await res.text();

  const match = text.match(/"thumbnail_url":"([^"]+)"/);
  if (!match) return null;

  return (
    match[1]
      .replace(/\\u0026/g, "&")
      .replace(/^http:/, "https:")
      // zoom=1 yields a larger image than the default thumbnail; drop page-curl.
      .replace(/([?&])zoom=\d+/, "$1zoom=1")
      .replace(/&edge=curl/, "")
  );
}
