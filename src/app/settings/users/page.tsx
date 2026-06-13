import { asc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { selectClass } from "@/app/books/form-ui";

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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔑 Benutzer</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Neues Konto</h2>
        <CreateForm action={createUserAction} submitLabel="Konto anlegen">
          <Input name="name" placeholder="Name" required />
          <Input name="email" type="email" placeholder="E-Mail" required />
          <Input name="password" type="text" placeholder="Passwort" required />
          <select name="role" defaultValue="viewer" className={`${selectClass} w-auto`}>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
          <select name="linkPersonId" defaultValue="none" className={`${selectClass} w-auto`}>
            <option value="none">— keine Person verknüpfen —</option>
            {unlinkedPersons.map((p) => (
              <option key={p.id} value={p.id}>
                ↔ {p.name}
              </option>
            ))}
          </select>
        </CreateForm>
      </div>

      <ul className="flex flex-col gap-3">
        {userList.map((user) => {
          const linked = personByUser.get(user.id);
          const isSelf = user.id === me.id;
          const isLastOwner = user.role === "owner" && ownerCount <= 1;
          return (
            <li key={user.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <form
                action={updateUserAction}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={user.id} />
                <Input name="name" defaultValue={user.name} className="w-36" />
                <Input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  className="w-56"
                />
                <select
                  name="role"
                  defaultValue={user.role}
                  className={`${selectClass} w-auto`}
                  disabled={isLastOwner}
                >
                  <option value="viewer">Viewer</option>
                  <option value="owner">Owner</option>
                </select>
                <Button type="submit" size="sm" variant="outline">
                  Speichern
                </Button>
                {isSelf ? <Badge variant="secondary">du</Badge> : null}
                {linked ? <Badge variant="outline">↔ {linked.name}</Badge> : null}
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <form
                  action={setUserPasswordAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={user.id} />
                  <Input
                    name="password"
                    type="text"
                    placeholder="neues Passwort"
                    className="w-44"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Passwort setzen
                  </Button>
                </form>
                {!isSelf && !isLastOwner ? (
                  <ConfirmButton action={deleteUserAction} id={user.id} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
