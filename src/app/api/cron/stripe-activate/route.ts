import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { notifyOrder } from "@/lib/notify";
import { monthlyPrice } from "@/lib/pricing";
import { getStripe, periodEnd } from "@/lib/stripe";

/**
 * Called by the database (card_checkout_verify) with a one-time ticket after an owner came back from
 * Stripe Checkout. The session is checked with Stripe here, on the server; only a complete, paid
 * session that belongs to the company activates the plan.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Claim = { workspace_id: string; session_id: string; name: string; org_number: string | null; packs: number; requested_by: string | null };

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const stripe = getStripe();
  if (!stripe) return Response.json({ ok: false, reason: "not_configured" });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("stripe_activate_claim", { p_ticket: ticket });
  if (error || !data) return new Response(null, { status: 404 });
  const c = data as unknown as Claim;

  try {
    const s = await stripe.checkout.sessions.retrieve(c.session_id, { expand: ["subscription"] });
    const sub = typeof s.subscription === "object" ? s.subscription : null;
    const customer = typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
    const m = s.metadata ?? {};
    const ok =
      s.status === "complete" &&
      (s.payment_status === "paid" || s.payment_status === "no_payment_required") &&
      m.workspace_id === c.workspace_id &&
      !!sub &&
      ["active", "trialing"].includes(sub.status) &&
      !!customer;
    if (!ok || !sub || !customer) return Response.json({ ok: false, reason: "not_paid" });

    const plan = m.plan === "bedrift" ? "bedrift" : "start";
    const interval = m.interval === "year" ? "year" : "month";
    const addon = m.addon === "1";
    const outlook = plan === "start" && m.outlook === "1";
    const email = m.email || s.customer_details?.email || c.requested_by || "";
    const { error: applyErr } = await db.rpc("stripe_activate_apply_v2", {
      p_ticket: ticket,
      p_plan: plan,
      p_interval: interval,
      p_addon: addon,
      p_outlook: outlook,
      p_email: email,
      p_subscription: sub.id,
      p_customer: customer,
      p_period_end: periodEnd(sub) ?? new Date().toISOString(),
    });
    if (applyErr) {
      console.error("stripe activate failed", applyErr.message);
      return Response.json({ ok: false }, { status: 500 });
    }

    after(async () => {
      // Tag the Stripe customer with the company, so it can be found from both sides.
      await stripe.customers
        .update(customer, { metadata: { workspace_id: c.workspace_id, org_number: c.org_number ?? "" }, preferred_locales: [s.locale === "en" ? "en" : "nb"] })
        .catch(() => {});
      await notifyOrder({
        workspace: c.name,
        orgNumber: c.org_number,
        plan: plan === "bedrift" ? "Bedrift" : "Start",
        interval,
        addon,
        outlook,
        invoiceEmail: email,
        reference: null,
        orderedBy: c.requested_by ?? "",
        monthly: monthlyPrice(
          { plan, discount_percent: 0, discount_until: null, suspended_at: null, billing_interval: "month", accounting_addon: addon, outlook_addon: outlook, extra_contact_packs: c.packs },
          new Date().toISOString().slice(0, 10),
        ),
        method: "card",
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("stripe activate check failed", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
