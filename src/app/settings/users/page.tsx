import { asc } from "drizzle-orm";
import Link from "next/link";
import { selectClass } from "@/app/books/form-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { persons as personsTable, users } from "@/db/schema";
import { requireOwner } from "@/lib/auth-helpers";
import {
  createUserAction,
  deleteUserAction,
  setUserPasswordAction,
  updateUserAction,
} from "../actions";
import { ConfirmButton, CreateForm } from "../ui";

export default async function UsersSettingsPage() {
  const me = await requireOwner();

  const [userList, personList] = await Promise.all([
    db.query.users.findMany({ orderBy: asc(users.name) }),
    db.query.persons.findMany({ orderBy: asc(personsTable.name) }),
  ]);

  const personByUser = new Map(
    personList.filter((p) => p.userId).map((p) => [p.userId!, p]),
  );
  const unlinkedPersons = personList.filter((p) => !p.userId);
  const ownerCount = userList.filter((u) => u.role === "owner").length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔑 Benutzer</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neues Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateForm action={createUserAction} submitLabel="Konto anlegen">
            <Field label="Name">
              <Input name="name" placeholder="Name" required className="w-full sm:w-36" />
            </Field>
            <Field label="E-Mail">
              <Input
                name="email"
                type="email"
                placeholder="E-Mail"
                required
                className="w-full sm:w-52"
              />
            </Field>
            <Field label="Passwort">
              <Input
                name="password"
                type="text"
                placeholder="Passwort"
                required
                className="w-full sm:w-36"
              />
            </Field>
            <Field label="Rolle">
              <select
                name="role"
                defaultValue="viewer"
                className={`${selectClass} sm:w-auto`}
              >
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <Field label="Person verknüpfen">
              <select
                name="linkPersonId"
                defaultValue="none"
                className={`${selectClass} sm:w-auto`}
              >
                <option value="none">— keine —</option>
                {unlinkedPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    ↔ {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </CreateForm>
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-3">
        {userList.map((user) => {
          const linked = personByUser.get(user.id);
          const isSelf = user.id === me.id;
          const isLastOwner = user.role === "owner" && ownerCount <= 1;
          const isOwnerRole = user.role === "owner";
          return (
            <li
              key={user.id}
              className="rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5"
            >
              {/* identity */}
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    isOwnerRole
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{user.name}</span>
                    <Badge variant={isOwnerRole ? "default" : "secondary"}>
                      {isOwnerRole ? "Owner" : "Viewer"}
                    </Badge>
                    {isSelf ? <Badge variant="outline">du</Badge> : null}
                    {linked ? (
                      <Badge variant="outline">↔ {linked.name}</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* edit */}
              <div className="mt-4 flex flex-col gap-3 border-t pt-4">
                <form
                  action={updateUserAction}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={user.id} />
                  <Field label="Name">
                    <Input name="name" defaultValue={user.name} className="w-full sm:w-36" />
                  </Field>
                  <Field label="E-Mail">
                    <Input
                      name="email"
                      type="email"
                      defaultValue={user.email}
                      className="w-full sm:w-52"
                    />
                  </Field>
                  <Field label="Rolle">
                    <select
                      name="role"
                      defaultValue={user.role}
                      className={`${selectClass} sm:w-auto`}
                      disabled={isLastOwner}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="owner">Owner</option>
                    </select>
                  </Field>
                  <Button type="submit" size="sm" variant="outline">
                    Speichern
                  </Button>
                </form>

                <div className="flex flex-wrap items-end justify-between gap-2">
                  <form
                    action={setUserPasswordAction}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={user.id} />
                    <Field label="Neues Passwort">
                      <Input
                        name="password"
                        type="text"
                        placeholder="••••"
                        className="w-full sm:w-44"
                      />
                    </Field>
                    <Button type="submit" size="sm" variant="outline">
                      Setzen
                    </Button>
                  </form>
                  {!isSelf && !isLastOwner ? (
                    <ConfirmButton action={deleteUserAction} id={user.id} />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
