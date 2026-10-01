"use server";

import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/session";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: t.common.invalidEmail, email };
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
    return { status: "error", email, message: error.status === 429 ? t.login.rateLimited : t.login.failed };
  }
  return { status: "sent", email };
}
