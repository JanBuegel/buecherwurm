import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the current session user, or null if not signed in. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Requires a signed-in user; redirects to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Requires an owner; viewers are bounced to the home page. */
export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/");
  return user;
}
