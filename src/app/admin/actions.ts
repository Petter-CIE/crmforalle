"use server";

import { revalidatePath } from "next/cache";
import type { FormResult } from "@/app/app/crm-actions";
import type { PlanType } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { PLAN_CONTACT_LIMIT } from "@/lib/pricing";
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
  let limit = Math.max(0, Math.min(1_000_000, Number(formData.get("contact_limit")) || 0));
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
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  return { ok: true };
}
