import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";

const OWNER_LINKS = [
  { href: "/settings/persons", title: "👤 Inhaber", desc: "Personen, denen Bücher gehören" },
  { href: "/settings/users", title: "🔑 Benutzer", desc: "Login-Konten & Rollen" },
  { href: "/settings/rooms", title: "🏠 Räume", desc: "Räume verwalten (Möbel folgen)" },
  { href: "/settings/tags", title: "🏷️ Tags", desc: "Umbenennen, zusammenführen, Farben" },
  { href: "/settings/backup", title: "💾 Backup", desc: "CSV-Export & -Import" },
];

export default async function SettingsPage() {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Start
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SettingCard
          href="/settings/profile"
          title="🙂 Profil"
          desc="Eigener Name & Passwort"
        />
        {isOwner
          ? OWNER_LINKS.map((l) => (
              <SettingCard key={l.href} href={l.href} title={l.title} desc={l.desc} />
            ))
          : null}
      </div>
    </main>
  );
}

function SettingCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
