"use server";

import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createMailerClient } from "@/lib/supabase/mailer";
import { safeNext, siteUrl } from "@/lib/session";

export type LoginState = { error?: string; email?: string };
export type LinkState = { error?: string; sent?: string };

/**
 * Sends a one-time login link. The answer is the same whether or not an account exists,
 * so the form can't be used to find out who has an account.
 */
export async function sendLoginLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(formData.get("neste"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.common.invalidEmail };

  const { error } = await createMailerClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent(next)}`,
    },
  });
  if (error?.status === 429) return { error: t.login.rateLimited };
  return { sent: t.login.linkSent(email) };
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("neste"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.common.invalidEmail, email };
  if (!password) return { error: t.login.invalidCredentials, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? t.login.invalidCredentials
        : error.code === "email_not_confirmed"
          ? t.login.notConfirmed
          : error.status === 429
            ? t.login.rateLimited
            : t.login.failed;
    return { error: message, email };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/logg-inn/mfa?neste=${encodeURIComponent(next)}`);
  }
  redirect(next);
}
