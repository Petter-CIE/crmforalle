"use server";

import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/session";

export type PasswordState = { ok?: boolean; error?: string };

async function savePassword(formData: FormData): Promise<string | null> {
  const { t } = await getI18n();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return t.register.tooShort;
  if (password !== confirm) return t.newPassword.mismatch;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/logg-inn");
  const { error } = await supabase.auth.updateUser({ password, data: { has_password: true } });
  if (error) {
    if (error.code === "weak_password") return t.register.weak;
    if (error.code === "same_password") return null; // already this password – fine
    return t.security.error;
  }
  return null;
}

/** Used by /nytt-passord (first password, reset): saves and continues. */
export async function setPasswordAndContinue(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const error = await savePassword(formData);
  if (error) return { error };
  redirect(safeNext(formData.get("neste")));
}

/** Used on the account page: saves and stays. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const error = await savePassword(formData);
  return error ? { error } : { ok: true };
}
