import { desc } from "drizzle-orm";
import { db } from "@/db";
import { copies } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { CSV_HEADER, MULTI_VALUE_SEPARATOR } from "@/lib/book-csv";
import { toCsv } from "@/lib/csv";

export async function GET() {
  await requireUser();

  const list = await db.query.copies.findMany({
    orderBy: desc(copies.createdAt),
    with: {
      book: true,
      owner: { columns: { name: true } },
      room: { columns: { name: true } },
      copyTags: { with: { tag: { columns: { name: true } } } },
    },
  });

  const rows: string[][] = [[...CSV_HEADER]];
  for (const c of list) {
    rows.push([
      c.book.ean ?? "",
      c.book.title,
      c.book.subtitle ?? "",
      (c.book.authors ?? []).join(MULTI_VALUE_SEPARATOR + " "),
      c.book.publisher ?? "",
      c.book.publishedYear?.toString() ?? "",
      c.book.pageCount?.toString() ?? "",
      c.book.language ?? "",
      c.owner.name,
      c.room?.name ?? "",
      c.status,
      c.condition ?? "",
      c.purchasePriceCents != null
        ? (c.purchasePriceCents / 100).toFixed(2)
        : "",
      c.copyTags.map((ct) => ct.tag.name).join(MULTI_VALUE_SEPARATOR + " "),
      c.notes ?? "",
      c.book.coverUrl ?? "",
    ]);
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="buecherwurm-export.csv"',
    },
  });
}
