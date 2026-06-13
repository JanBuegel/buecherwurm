import { readFile } from "node:fs/promises";
import path from "node:path";
import { COVER_CONTENT_TYPES, COVERS_DIR } from "@/lib/covers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  // Guard against path traversal — only plain file names are allowed.
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(COVERS_DIR, file));
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": COVER_CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
