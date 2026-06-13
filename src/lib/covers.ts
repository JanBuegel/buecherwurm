import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const COVERS_DIR = path.join(process.cwd(), "data", "covers");

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

export const COVER_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Persists an uploaded cover image under data/covers/ and returns the public
 * path (served by the /covers/[file] route). Returns null for empty uploads.
 */
export async function saveCoverFile(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;

  const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
  const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
  const name = `${crypto.randomUUID()}.${ext}`;

  await mkdir(COVERS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(COVERS_DIR, name), buffer);

  return `/covers/${name}`;
}
