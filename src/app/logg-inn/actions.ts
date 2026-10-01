"use server";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/session";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Skriv inn en gyldig e-postadresse.", email };
  }
  const next = safeNext(formData.get("neste"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    const rateLimited = error.status === 429;
    return {
      status: "error",
      email,
      message: rateLimited
        ? "For mange forsøk. Vent litt og prøv igjen."
        : "Vi kunne ikke sende innloggingslenken. Prøv igjen.",
    };
  }
  return { status: "sent", email };
}
