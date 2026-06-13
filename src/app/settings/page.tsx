import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, requireUser } from "@/lib/auth-helpers";

type Item = {
  href: string;
  icon: string;
  title: string;
  desc: string;
  tint: string;
};

const PROFILE: Item = {
  href: "/settings/profile",
  icon: "🙂",
  title: "Profil",
  desc: "Eigener Name & Passwort",
  tint: "bg-rose-100 dark:bg-rose-950/60",
};

const OWNER_LINKS: Item[] = [
  {
    href: "/settings/persons",
    icon: "👤",
    title: "Inhaber",
    desc: "Personen, denen Bücher gehören",
    tint: "bg-sky-100 dark:bg-sky-950/60",
  },
  {
    href: "/settings/users",
    icon: "🔑",
    title: "Benutzer",
    desc: "Login-Konten & Rollen",
    tint: "bg-amber-100 dark:bg-amber-950/60",
  },
  {
    href: "/settings/rooms",
    icon: "🏠",
    title: "Räume",
    desc: "Räume verwalten (Möbel folgen)",
    tint: "bg-orange-100 dark:bg-orange-950/60",
  },
  {
    href: "/settings/tags",
    icon: "🏷️",
    title: "Tags",
    desc: "Umbenennen, zusammenführen, Farben",
    tint: "bg-violet-100 dark:bg-violet-950/60",
  },
  {
    href: "/settings/backup",
    icon: "💾",
    title: "Backup",
    desc: "CSV-Export & -Import",
    tint: "bg-emerald-100 dark:bg-emerald-950/60",
  },
];

export default async function SettingsPage() {
  await requireUser();
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";

  const items = isOwner ? [PROFILE, ...OWNER_LINKS] : [PROFILE];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <SettingCard key={item.href} item={item} />
        ))}
      </div>
    </main>
  );
}

function SettingCard({ item }: { item: Item }) {
  return (
    <Link href={item.href} className="group block h-full">
      <article className="flex h-full items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-foreground/15">
        <div
          className={`grid size-12 shrink-0 place-items-center rounded-xl text-2xl ${item.tint}`}
        >
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground">{item.desc}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </article>
    </Link>
  );
}
