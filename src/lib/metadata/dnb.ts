import { XMLParser } from "fast-xml-parser";
import { isValidIsbn13, normalizeIsbn } from "../isbn";
import type { BookMetadata } from "./types";

const SRU_URL = "https://services.dnb.de/sru/dnb";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Always treat these as arrays so we don't special-case single vs many.
  isArray: (name) => name === "datafield" || name === "subfield",
});

type Subfield = { "@_code": string; "#text"?: string | number };
type Datafield = { "@_tag": string; subfield?: Subfield[] };

function asText(value: unknown): string {
  if (value == null) return "";
  // DNB marks non-filing characters with C1 control chars (e.g. the article in
  // "Die zwei Türme"). They arrive raw or as numeric entities — strip both.
  return String(value)
    .replace(/&#1[2-5][0-9];/g, "")
    .replace(/[\u0080-\u009F]/g, "")
    .trim();
}

function datafields(record: Record<string, unknown>, tag: string): Datafield[] {
  const fields = (record.datafield as Datafield[] | undefined) ?? [];
  return fields.filter((f) => f["@_tag"] === tag);
}

function subfield(field: Datafield | undefined, code: string): string {
  const sf = field?.subfield?.find((s) => s["@_code"] === code);
  return asText(sf?.["#text"]);
}

function allSubfields(fields: Datafield[], code: string): string[] {
  return fields
    .flatMap((f) => f.subfield?.filter((s) => s["@_code"] === code) ?? [])
    .map((s) => asText(s["#text"]))
    .filter(Boolean);
}

/** Strips MARC trailing ISBD punctuation like " /", " :", " ;". */
function cleanIsbd(value: string): string {
  return value.replace(/\s*[/:;,.]\s*$/, "").trim();
}

/** DNB delivers names as "Nachname, Vorname" — flip to "Vorname Nachname". */
function flipName(name: string): string {
  const idx = name.indexOf(", ");
  if (idx === -1) return name.trim();
  const last = name.slice(0, idx).trim();
  const first = name.slice(idx + 2).trim();
  return `${first} ${last}`.trim();
}

const LANG_MAP: Record<string, string> = {
  ger: "de",
  deu: "de",
  eng: "en",
  fre: "fr",
  fra: "fr",
  spa: "es",
  ita: "it",
  dut: "nl",
  nld: "nl",
};

function mapLanguage(code: string): string | null {
  if (!code) return null;
  const lc = code.toLowerCase();
  return LANG_MAP[lc] ?? lc.slice(0, 2);
}

export async function lookupDnb(
  isbn: string,
  signal?: AbortSignal,
): Promise<BookMetadata | null> {
  const url =
    `${SRU_URL}?version=1.1&operation=searchRetrieve` +
    `&query=NUM%3D${encodeURIComponent(isbn)}` +
    `&recordSchema=MARC21-xml&maximumRecords=1`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const xml = await res.text();

  const parsed = parser.parse(xml);
  const response = parsed?.searchRetrieveResponse;
  if (!response || Number(response.numberOfRecords) < 1) return null;

  // searchRetrieveResponse > records > record > recordData > record (MARC)
  let recordNode = response.records?.record;
  if (Array.isArray(recordNode)) recordNode = recordNode[0];
  const marc = recordNode?.recordData?.record as
    | Record<string, unknown>
    | undefined;
  if (!marc) return null;

  // --- identifiers (020 $a) ---
  const isbns = allSubfields(datafields(marc, "020"), "a").map(normalizeIsbn);
  const ean =
    isbns.find(isValidIsbn13) ??
    (isValidIsbn13(normalizeIsbn(isbn)) ? normalizeIsbn(isbn) : null);
  const isbn10 = isbns.find((v) => v.length === 10) ?? null;

  // --- title (245 $a / $b) ---
  const title245 = datafields(marc, "245")[0];
  const title = cleanIsbd(subfield(title245, "a"));
  if (!title) return null;
  const subtitle = cleanIsbd(subfield(title245, "b")) || null;

  // --- authors (100 + 700 $a) ---
  const authors = [
    ...allSubfields(datafields(marc, "100"), "a"),
    ...allSubfields(datafields(marc, "700"), "a"),
  ].map(flipName);

  // --- publication (264 $b/$c, fallback 260) ---
  const pub = datafields(marc, "264")[0] ?? datafields(marc, "260")[0];
  const publisher = cleanIsbd(subfield(pub, "b")) || null;
  const yearMatch = subfield(pub, "c").match(/\d{4}/);
  const publishedYear = yearMatch ? Number(yearMatch[0]) : null;

  // --- pages (300 $a) ---
  const pagesMatch = subfield(datafields(marc, "300")[0], "a").match(/\d+/);
  const pageCount = pagesMatch ? Number(pagesMatch[0]) : null;

  // --- language (041 $a) ---
  const language = mapLanguage(subfield(datafields(marc, "041")[0], "a"));

  // --- description (520 $a, rarely present) ---
  const description = subfield(datafields(marc, "520")[0], "a") || null;

  return {
    ean,
    isbn10,
    title,
    subtitle,
    authors: [...new Set(authors)],
    publisher,
    publishedYear,
    pageCount,
    language,
    description,
    coverUrl: null, // DNB does not reliably expose covers
    sources: ["dnb"],
  };
}
