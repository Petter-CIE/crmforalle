"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import type { PlanType } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { CONTACT_PACK, PLAN_CONTACT_LIMIT } from "@/lib/pricing";
import { notifyDeletion } from "@/lib/notify";
import { adminStatus } from "./guard";

const PLANS: PlanType[] = ["trial", "start", "bedrift", "free"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function updateWorkspaceAdmin(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, isAdmin, hasAal2 } = await adminStatus();
  const { t } = await getI18n();
  if (!isAdmin || !hasAal2) return { error: t.admin.failed };

  const id = String(formData.get("id") ?? "");
  const plan = String(formData.get("plan") ?? "") as PlanType;
  const trialEnds = String(formData.get("trial_ends") ?? "");
  const until = String(formData.get("discount_until") ?? "");
  if (!UUID.test(id) || !PLANS.includes(plan) || !DATE.test(trialEnds)) return { error: t.admin.failed };

  // When the plan changes and the limit was still the old plan's default, move it to the new plan's default.
  const prevPlan = String(formData.get("prev_plan") ?? "") as PlanType;
  // 0 = unlimited. An empty or invalid value falls back to the plan's default.
  const raw = String(formData.get("contact_limit") ?? "").replace(/\s/g, "");
  let limit = /^\d+$/.test(raw) ? Math.min(1_000_000, Number(raw)) : PLAN_CONTACT_LIMIT[plan];
  if (PLANS.includes(prevPlan) && prevPlan !== plan && limit === PLAN_CONTACT_LIMIT[prevPlan]) limit = PLAN_CONTACT_LIMIT[plan];

  const { error } = await supabase.rpc("admin_update_workspace", {
    p_id: id,
    p_plan: plan,
    // late evening of the chosen day in Oslo (summer and winter time)
    p_trial_ends_at: new Date(`${trialEnds}T21:00:00Z`).toISOString(),
    p_contact_limit: limit,
    p_discount_percent: Math.max(0, Math.min(100, Math.round(Number(formData.get("discount_percent")) || 0))),
    p_discount_until: DATE.test(until) ? until : null,
    p_discount_note: String(formData.get("discount_note") ?? "").slice(0, 500) || null,
    p_admin_note: String(formData.get("admin_note") ?? "").slice(0, 5000) || null,
    p_suspended: formData.get("suspended") === "1",
  });
  if (error) return { error: t.admin.failed };
  const interval = formData.get("billing_interval") === "year" ? "year" : "month";
  const { error: billingError } = await supabase.rpc("admin_update_billing", {
    p_id: id,
    p_interval: interval,
    p_addon: formData.get("accounting_addon") === "1",
  });
  if (billingError) return { error: t.admin.failed };
  // extra contact packs, capped to what the (new) plan allows
  const packs = Math.max(0, Math.min(CONTACT_PACK[plan]?.max ?? 0, Math.round(Number(formData.get("extra_contact_packs")) || 0)));
  const { error: packsError } = await supabase.rpc("admin_update_packs", { p_id: id, p_packs: packs });
  if (packsError) return { error: t.admin.failed };
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  return { ok: true };
}

/** Removes attachment files from storage. Best effort: the database rows are already gone. */
async function removeFiles(supabase: Awaited<ReturnType<typeof adminStatus>>["supabase"], paths: string[] | null) {
  const list = paths ?? [];
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await supabase.storage.from("attachments").remove(list.slice(i, i + 100));
    if (error) console.error("attachment cleanup failed", error.message);
  }
}

/**
 * Permanently deletes a company's data ("data") or the whole company ("workspace").
 * The admin must type the exact company name. Owners and admins of the company get an e-mail.
 */
async function adminDelete(kind: "data" | "workspace", formData: FormData): Promise<FormResult> {
  const { supabase, isAdmin, hasAal2 } = await adminStatus();
  const { t } = await getI18n();
  if (!isAdmin || !hasAal2) return { error: t.admin.failed };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: t.admin.failed };
  const confirm = String(formData.get("confirm_name") ?? "").trim();

  // Collect who to notify before the members are gone.
  const [{ data: all }, { data: members }] = await Promise.all([
    supabase.rpc("admin_workspaces_v3"),
    supabase.rpc("admin_workspace_members", { p_id: id }),
  ]);
  const w = (all ?? []).find((x) => x.id === id);
  if (!w) return { error: t.admin.failed };
  if (confirm !== w.name) return { error: t.admin.deleteMismatch };
  const recipients = (members ?? [])
    .filter((m) => (m.role === "owner" || m.role === "admin") && m.email)
    .map((m) => ({ email: m.email!, name: m.full_name }));

  const { data: paths, error } = await supabase.rpc(kind === "workspace" ? "admin_delete_workspace" : "admin_wipe_workspace_data", {
    p_id: id,
    p_confirm_name: confirm,
  });
  if (error) {
    console.error("admin delete failed", error.message);
    return { error: error.message.includes("name_mismatch") ? t.admin.deleteMismatch : t.admin.failed };
  }
  await removeFiles(supabase, paths);
  if (kind === "workspace") {
    const { data: logos } = await supabase.storage.from("logos").list(id);
    if (logos && logos.length > 0) await supabase.storage.from("logos").remove(logos.map((f) => `${id}/${f.name}`));
  }
  const sent = formData.get("notify") === "1" ? await notifyDeletion({ kind, workspaceName: w.name, orgNumber: w.org_number, recipients }) : 0;

  revalidatePath("/admin");
  if (kind === "workspace") redirect(`/admin?slettet=${encodeURIComponent(w.name)}&varslet=${sent}`);
  revalidatePath(`/admin/${id}`);
  return { ok: true, message: t.admin.wiped(sent) };
}

export async function wipeWorkspaceDataAdmin(_p: FormResult, formData: FormData) {
  return adminDelete("data", formData);
}

export async function deleteWorkspaceAdmin(_p: FormResult, formData: FormData) {
  return adminDelete("workspace", formData);
}

/** Marks or unmarks a company as pilot customer (50 % for the first year, invoice only). */
export async function setPilotAdmin(formData: FormData) {
  const { supabase, isAdmin, hasAal2 } = await adminStatus();
  if (!isAdmin || !hasAal2) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { error } = await supabase.rpc("admin_set_pilot", { p_id: id, p_on: formData.get("on") === "1" });
  if (error) console.error("admin_set_pilot failed", error.message);
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

/** Marks feedback as handled, or opens it again. */
export async function setFeedbackHandledAdmin(formData: FormData) {
  const { supabase, isAdmin, hasAal2 } = await adminStatus();
  if (!isAdmin || !hasAal2) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const handled = formData.get("handled") === "1";
  const { error } = await supabase.from("feedback").update({ handled_at: handled ? new Date().toISOString() : null }).eq("id", id);
  if (error) console.error("feedback update failed", error.message);
  revalidatePath("/admin/tilbakemeldinger");
}
