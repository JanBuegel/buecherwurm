import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-helpers";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const user = await getCurrentUser();
  if (!user) return null; // hidden on /login and other unauthenticated pages

  const items = [
    { href: "/books", label: "Bestand" },
    { href: "/rooms", label: "Regale" },
  ];
  if (user.role === "owner") {
    items.push({ href: "/settings", label: "Einstellungen" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:px-4">
        <Link href="/" className="mr-1 font-bold whitespace-nowrap sm:mr-2">
          📚 <span className="hidden min-[420px]:inline">Bücherwurm</span>
        </Link>
        <NavLinks items={items} />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Abmelden
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
