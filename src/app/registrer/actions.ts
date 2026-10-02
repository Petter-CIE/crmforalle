"use server";

import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/session";

export type RegisterState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const { t, locale } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: t.common.invalidEmail, email };
  if (password.length < 8) return { status: "error", message: t.register.tooShort, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent("/kom-i-gang")}`,
      data: { has_password: true, locale },
    },
  });
  if (error) {
    const message =
      error.code === "weak_password"
        ? t.register.weak
        : error.code === "user_already_exists" || error.code === "email_exists"
          ? t.register.exists
          : error.status === 429
            ? t.login.rateLimited
            : t.register.failed;
    return { status: "error", message, email };
  }
  // Supabase hides existing accounts: a user without identities means the e-mail is taken.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { status: "error", message: t.register.exists, email };
  }
  return { status: "sent", email };
}
