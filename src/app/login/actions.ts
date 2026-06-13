"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return null;
  } catch (error) {
    // signIn throws a redirect on success — let that propagate.
    if (error instanceof AuthError) {
      return { error: "E-Mail oder Passwort ist falsch." };
    }
    throw error;
  }
}
