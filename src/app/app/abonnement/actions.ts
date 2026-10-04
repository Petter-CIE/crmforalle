"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { notifyOrder } from "@/lib/notify";
import { monthlyPrice } from "@/lib/pricing";
import { canManage, requireWorkspace } from "@/lib/session";

/** The customer orders Start or Bedrift; active at once, invoiced by CIE AS. */
export async function orderSubscription(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const s = t.subscription;
  if (!canManage(workspace.role)) return { error: s.onlyAdmins };
  const plan = formData.get("plan") === "bedrift" ? "bedrift" : "start";
  const interval = formData.get("interval") === "year" ? "year" : "month";
  const addon = plan === "start" && formData.get("addon") === "1";
  const invoiceEmail = String(formData.get("invoice_email") ?? "").trim().slice(0, 200);
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 100) || null;

  const { error } = await supabase.rpc("order_subscription", {
    p_workspace: workspace.id,
    p_plan: plan,
    p_interval: interval,
    p_addon: addon,
    p_invoice_email: invoiceEmail,
    p_reference: reference,
  });
  if (error) {
    if (error.message.includes("too_many_contacts")) return { error: s.tooMany };
    if (error.message.includes("invalid_email")) return { error: s.badEmail };
    console.error("order_subscription failed", error.message);
    return { error: s.failed };
  }
  const { data: w } = await supabase.from("workspaces").select("extra_contact_packs").eq("id", workspace.id).single();
  const monthly = monthlyPrice(
    { plan, discount_percent: 0, discount_until: null, suspended_at: null, billing_interval: "month", accounting_addon: addon, extra_contact_packs: w?.extra_contact_packs ?? 0 },
    new Date().toISOString().slice(0, 10),
  );
  after(() =>
    notifyOrder({
      workspace: workspace.name,
      orgNumber: workspace.org_number,
      plan: plan === "bedrift" ? "Bedrift" : "Start",
      interval,
      addon,
      invoiceEmail,
      reference,
      orderedBy: user.email ?? "",
      monthly,
    }),
  );
  revalidatePath("/app", "layout");
  return { ok: true, message: s.ordered };
}
