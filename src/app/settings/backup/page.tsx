import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireOwner } from "@/lib/auth-helpers";
import { importCsvAction } from "../actions";
import { CreateForm } from "../ui";

export default async function BackupSettingsPage() {
  await requireOwner();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💾 Backup</h1>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Einstellungen
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export</CardTitle>
          <CardDescription>
            Gesamten Bestand als CSV herunterladen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<a href="/api/export" download />}
          >
            CSV exportieren
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import</CardTitle>
          <CardDescription>
            CSV importieren. Bücher werden per EAN dedupliziert; Personen, Räume
            und Tags werden bei Bedarf angelegt. Exemplare werden hinzugefügt
            (kein Ersetzen).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateForm
            action={importCsvAction}
            submitLabel="Importieren"
            className="flex flex-wrap items-center gap-2"
          >
            <Input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="max-w-xs"
            />
          </CreateForm>
        </CardContent>
      </Card>
    </main>
  );
}
