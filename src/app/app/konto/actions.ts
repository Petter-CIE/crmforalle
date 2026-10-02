"use server";

import { revalidatePath } from "next/cache";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function updateProfile(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireWorkspace();
  const { t } = await getI18n();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 200);
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null, notify_email: formData.get("notify_email") === "1" })
    .eq("id", user.id);
  if (error) return { error: t.security.error };
  revalidatePath("/app", "layout");
  return { ok: true };
}
