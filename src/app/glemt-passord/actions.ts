"use server";

import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/session";

export type ForgotState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: t.common.invalidEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent("/nytt-passord")}`,
  });
  if (error?.status === 429) return { status: "error", message: t.login.rateLimited };
  // Same answer whether or not the account exists (no account enumeration).
  return { status: "sent" };
}
