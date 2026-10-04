"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth-redirect";

const loginSchema = z.object({
  // Email ATAU username (tanpa @). Username admin dev: "admin".
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^[a-z0-9._-]{2,32}$/.test(v), {
      message: "Isi email atau username yang valid",
    }),
  password: z.string().min(4).max(128),
});

export async function signInWithEmail(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid-credentials");

  try {
    const redirectTo = safeReturnTo(formData.get("returnTo")) ?? "/login/redirect";
    await signIn("credentials", {
      // Diteruskan sebagai "email" — authorize() membedakan email vs username
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=invalid-credentials");
    throw error;
  }
}

export async function signInWithGoogle(formData: FormData) {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    redirect("/login?error=google-not-configured");
  }

  const redirectTo = safeReturnTo(formData.get("returnTo")) ?? "/login/redirect";
  await signIn("google", { redirectTo });
}
