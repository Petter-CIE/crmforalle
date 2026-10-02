"use server";

import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/session";

export type MfaState = { error?: string };

export async function verifyMfa(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const { t } = await getI18n();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect("/app");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: t.mfa.invalid };
  redirect(safeNext(formData.get("neste")));
}
