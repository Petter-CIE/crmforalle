"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { notifyOrder } from "@/lib/notify";
import { monthlyPrice } from "@/lib/pricing";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";
import { getStripe, lineItems } from "@/lib/stripe";

/** The customer orders Start or Bedrift; active at once, invoiced by CIE AS. */
export async function orderSubscription(_p: FormResult, formData: FormData): Promise<FormResult> {
  if (formData.get("method") === "card") return startCardCheckout(formData);
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const s = t.subscription;
  if (!canManage(workspace.role)) return { error: s.onlyAdmins };
  const plan = formData.get("plan") === "bedrift" ? "bedrift" : "start";
  const interval = formData.get("interval") === "year" ? "year" : "month";
  const addon = plan === "start" && formData.get("addon") === "1";
  const invoiceEmail = String(formData.get("invoice_email") ?? "").trim().slice(0, 200);
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 100) || null;

  const { error } = await supabase.rpc("order_subscription_invoice", {
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
  const { data: w } = await supabase.from("workspaces").select("extra_contact_packs, pilot_at").eq("id", workspace.id).single();
  const monthly = monthlyPrice(
    { plan, discount_percent: 0, discount_until: null, suspended_at: null, billing_interval: "month", accounting_addon: addon, extra_contact_packs: w?.extra_contact_packs ?? 0 },
    new Date().toISOString().slice(0, 10),
  );
  after(() =>
    notifyOrder({
      pilot: !!w?.pilot_at,
      workspace: workspace.name,
      orgNumber: workspace.org_number,
      plan: plan === "bedrift" ? "Bedrift" : "Start",
      interval,
      addon,
      invoiceEmail,
      reference,
      orderedBy: user.email ?? "",
      monthly,
      method: "invoice",
    }),
  );
  revalidatePath("/app", "layout");
  return { ok: true, message: s.ordered };
}

/** Card: sends the owner to Stripe Checkout. The plan is activated when they come back (stripe-retur). */
async function startCardCheckout(formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, locale } = await getI18n();
  const s = t.subscription;
  if (!canManage(workspace.role)) return { error: s.onlyAdmins };
  const stripe = getStripe();
  if (!stripe) return { error: s.failed };
  const plan = formData.get("plan") === "bedrift" ? "bedrift" : "start";
  const interval = formData.get("interval") === "year" ? "year" : "month";
  const addon = plan === "start" && formData.get("addon") === "1";
  const email = String(formData.get("invoice_email") ?? "").trim().slice(0, 200) || user.email || "";

  let url: string | null = null;
  try {
    const { data: w } = await supabase.from("workspaces").select("stripe_customer_id, extra_contact_packs, org_number").eq("id", workspace.id).single();
    // A returning customer keeps their Stripe customer; a new one is created by Checkout and stored
    // only after the server has verified the payment (see /api/cron/stripe-activate).
    const customer = w?.stripe_customer_id ?? null;
    const meta = { workspace_id: workspace.id, plan, interval, addon: addon ? "1" : "0", email };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customer ? { customer, customer_update: { name: "auto", address: "auto" } as const } : { customer_email: email || undefined }),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      line_items: await lineItems(stripe, { plan, interval, addon, packs: w?.extra_contact_packs ?? 0 }),
      locale: locale === "en" ? "en" : "nb",
      metadata: meta,
      subscription_data: { metadata: meta, description: `AllSeats CRM – ${workspace.name}` },
      success_url: `${siteUrl()}/app/abonnement/stripe-retur?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/app/abonnement`,
    });
    url = session.url;
  } catch (e) {
    console.error("stripe checkout failed", e instanceof Error ? e.message : e);
    return { error: s.failed };
  }
  if (!url) return { error: s.failed };
  redirect(url);
}

/** Stripe's own page for changing card, downloading receipts and cancelling. */
export async function openBillingPortal() {
  const { supabase, workspace } = await requireWorkspace();
  const stripe = getStripe();
  if (!stripe || !canManage(workspace.role)) redirect("/app/abonnement");
  const { data: w } = await supabase.from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  if (!w?.stripe_customer_id) redirect("/app/abonnement");
  let url = "/app/abonnement?portal=feil";
  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: w.stripe_customer_id, return_url: `${siteUrl()}/app/abonnement` });
    url = portal.url;
  } catch (e) {
    console.error("stripe portal failed", e instanceof Error ? e.message : e);
  }
  redirect(url);
}
