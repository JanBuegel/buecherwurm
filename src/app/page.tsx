import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📚 Bücherwurm</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Willkommen, {user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Rolle:{" "}
            <Badge variant={user.role === "owner" ? "default" : "secondary"}>
              {user.role === "owner" ? "Owner" : "Viewer"}
            </Badge>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Das Fundament steht. Als Nächstes: Bücher erfassen (Phase 2).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
