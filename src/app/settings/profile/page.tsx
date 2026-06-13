import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { changePasswordAction, updateProfileAction } from "../actions";
import { CreateForm } from "../ui";

export default async function ProfileSettingsPage() {
  const me = await requireUser();
  const user = await db.query.users.findFirst({ where: eq(users.id, me.id) });

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🙂 Profil</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Name</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateForm
            action={updateProfileAction}
            submitLabel="Speichern"
            successLabel="✓ Gespeichert"
            resetOnSuccess={false}
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Anzeigename</Label>
              <Input
                name="name"
                defaultValue={user?.name ?? ""}
                className="w-64"
                required
              />
            </div>
          </CreateForm>
          <p className="mt-2 text-xs text-muted-foreground">
            E-Mail: {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateForm
            action={changePasswordAction}
            submitLabel="Passwort ändern"
            successLabel="✓ Passwort geändert"
            className="flex flex-col items-start gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Aktuelles Passwort
              </Label>
              <Input
                name="current"
                type="password"
                autoComplete="current-password"
                className="w-64"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Neues Passwort
              </Label>
              <Input
                name="next"
                type="password"
                autoComplete="new-password"
                className="w-64"
                required
              />
            </div>
          </CreateForm>
        </CardContent>
      </Card>
    </main>
  );
}
