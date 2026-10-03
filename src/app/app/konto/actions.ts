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
    .update({
      full_name: fullName || null,
      notify_email: formData.get("notify_email") === "1",
      digest_email: formData.get("digest_email") === "1",
    })
    .eq("id", user.id);
  if (error) return { error: t.security.error };
  revalidatePath("/app", "layout");
  return { ok: true };
}

const IDLE_OPTIONS = [0, 15, 30, 60, 120, 240, 480];

export async function updateIdleTimeout(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireWorkspace();
  const { t } = await getI18n();
  const minutes = Number(formData.get("idle_timeout_minutes"));
  if (!IDLE_OPTIONS.includes(minutes)) return { error: t.security.error };
  const { error } = await supabase.from("profiles").update({ idle_timeout_minutes: minutes }).eq("id", user.id);
  if (error) return { error: t.security.error };
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Stores this device's push subscription for the signed-in user. */
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string; userAgent: string }) {
  const { supabase } = await requireWorkspace();
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000 || !sub.p256dh || !sub.auth) return { ok: false };
  const { error } = await supabase.rpc("push_subscribe", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh.slice(0, 200),
    p_auth: sub.auth.slice(0, 100),
    p_user_agent: sub.userAgent.slice(0, 300),
  });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string) {
  const { supabase, user } = await requireWorkspace();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}

export async function sendTestPush() {
  const { supabase } = await requireWorkspace();
  const { t } = await getI18n();
  const { data, error } = await supabase.rpc("queue_test_push", { p_title: "AllSeats CRM", p_body: t.mobile.pushEnabled });
  return { ok: !error && (data ?? 0) > 0 };
}
