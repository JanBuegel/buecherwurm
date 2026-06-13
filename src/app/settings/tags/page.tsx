import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import {
  createTagAction,
  deleteTagAction,
  renameTagAction,
  setTagColorAction,
} from "../actions";
import { ConfirmButton, CreateForm } from "../ui";

export default async function TagsSettingsPage() {
  await requireOwner();
  const tagList = await db.query.tags.findMany({
    orderBy: asc(tags.name),
    with: { copyTags: { columns: { copyId: true } } },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏷️ Tags</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <CreateForm action={createTagAction} submitLabel="Tag anlegen">
        <Input name="name" placeholder="Tag-Name" required />
        <Input
          name="color"
          type="color"
          defaultValue="#64748b"
          className="w-14 p-1"
        />
      </CreateForm>

      <ul className="flex flex-col divide-y rounded-lg border">
        {tagList.map((tag) => {
          const count = tag.copyTags.length;
          return (
            <li key={tag.id} className="flex flex-wrap items-center gap-2 p-3">
              <form
                action={setTagColorAction}
                className="flex items-center gap-1"
              >
                <input type="hidden" name="id" value={tag.id} />
                <Input
                  name="color"
                  type="color"
                  defaultValue={tag.color ?? "#64748b"}
                  className="w-10 p-1"
                  aria-label="Farbe"
                />
                <Button type="submit" size="xs" variant="ghost">
                  Farbe
                </Button>
              </form>
              <form action={renameTagAction} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={tag.id} />
                <Input name="name" defaultValue={tag.name} className="max-w-xs" />
                <Button type="submit" size="sm" variant="outline">
                  Umbenennen
                </Button>
              </form>
              <span className="text-xs text-muted-foreground">
                {count}×
              </span>
              <ConfirmButton action={deleteTagAction} id={tag.id} />
            </li>
          );
        })}
        {tagList.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">
            Noch keine Tags.
          </li>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        Umbenennen auf einen bereits existierenden Namen führt die beiden Tags
        zusammen.
      </p>
    </main>
  );
}
