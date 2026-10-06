"use server";

import { revalidatePath } from "next/cache";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace, siteUrl } from "@/lib/session";

export async function updateProfile(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireWorkspace();
  const { t } = await getI18n();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 200);
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: String(formData.get("phone") ?? "").trim().slice(0, 40) || null,
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

/** The personal calendar link (created on first use; `rotate` makes a new one and disables the old). */
export async function getCalendarLink(rotate = false) {
  const { supabase } = await requireWorkspace();
  const { data, error } = await supabase.rpc("calendar_link", { p_rotate: rotate });
  if (error || !data) return null;
  return `${siteUrl()}/api/kalender/${data}.ics`;
}

/** Options for one connected mailbox: mail logging, calendar use and its project. */
export async function saveOutlookOptions(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  const project = String(formData.get("project_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  let projectId: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(project)) {
    const { data } = await supabase.from("projects").select("id").eq("id", project).eq("workspace_id", workspace.id).maybeSingle();
    projectId = data?.id ?? null;
  }
  await supabase
    .from("mail_connections")
    .update({ mail_enabled: formData.get("mail") === "1", calendar_enabled: formData.get("calendar") === "1", project_id: projectId })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id);
  revalidatePath("/app/konto");
}

/** Removes one mailbox connection (and its stored token). Access can also be revoked at myapps.microsoft.com. */
export async function disconnectOutlook(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await supabase.from("mail_connections").delete().eq("id", id).eq("workspace_id", workspace.id).eq("user_id", user.id);
  revalidatePath("/app/konto");
}

/** Adds a shared mailbox (read through the user's own Microsoft connection) with an optional project. */
export async function addSharedMailbox(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const parent = String(formData.get("parent_id") ?? "");
  const address = String(formData.get("address") ?? "").trim().toLowerCase();
  const project = String(formData.get("project_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(parent) || !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(address)) return;
  const { data: own } = await supabase
    .from("mail_connections")
    .select("id")
    .eq("id", parent)
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .is("parent_id", null)
    .maybeSingle();
  if (!own) return;
  let projectId: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(project)) {
    const { data } = await supabase.from("projects").select("id").eq("id", project).eq("workspace_id", workspace.id).maybeSingle();
    projectId = data?.id ?? null;
  }
  await supabase.from("mail_connections").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    provider: "microsoft",
    parent_id: own.id,
    mailbox: address,
    account_email: address,
    refresh_token: "",
    project_id: projectId,
    calendar_enabled: false,
  });
  revalidatePath("/app/konto");
}
