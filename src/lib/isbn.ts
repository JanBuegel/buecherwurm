/** Strips hyphens, spaces and uppercases the trailing X. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = isbn[i];
    sum += (c === "X" ? 10 : Number(c)) * (10 - i);
  }
  return sum % 11 === 0;
}

/** Converts a valid ISBN-10 to its ISBN-13 (978 prefix) form. */
export function isbn10to13(isbn10: string): string | null {
  if (!isValidIsbn10(isbn10)) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

/** Returns true for a valid ISBN-10 or ISBN-13 (already normalized). */
export function isValidIsbn(isbn: string): boolean {
  return isValidIsbn13(isbn) || isValidIsbn10(isbn);
}
