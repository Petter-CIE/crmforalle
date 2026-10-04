import { after } from "next/server";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { flash } from "@/lib/flash";
import { notifyOrder } from "@/lib/notify";
import { monthlyPrice } from "@/lib/pricing";
import { canManage, requireWorkspace } from "@/lib/session";
import { getStripe, periodEnd } from "@/lib/stripe";

/**
 * Back from Stripe Checkout. The session is fetched from Stripe (never trusted from the URL alone):
 * it must be complete, paid and belong to this company before the plan is activated.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  const { supabase, user, workspace } = await requireWorkspace();
  const stripe = getStripe();
  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !canManage(workspace.role)) redirect("/app/abonnement");

  let ok = false;
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const sub = typeof s.subscription === "object" ? s.subscription : null;
    const m = s.metadata ?? {};
    if (
      s.status === "complete" &&
      (s.payment_status === "paid" || s.payment_status === "no_payment_required") &&
      m.workspace_id === workspace.id &&
      sub &&
      ["active", "trialing"].includes(sub.status)
    ) {
      const plan = m.plan === "bedrift" ? "bedrift" : "start";
      const interval = m.interval === "year" ? "year" : "month";
      const addon = m.addon === "1";
      const email = m.email || s.customer_details?.email || user.email || "";
      const { error } = await supabase.rpc("activate_card_subscription", {
        p_workspace: workspace.id,
        p_plan: plan,
        p_interval: interval,
        p_addon: addon,
        p_email: email,
        p_subscription: sub.id,
        p_period_end: periodEnd(sub),
      });
      if (error) console.error("activate_card_subscription failed", error.message);
      else {
        ok = true;
        const { data: w } = await supabase.from("workspaces").select("extra_contact_packs").eq("id", workspace.id).single();
        after(() =>
          notifyOrder({
            workspace: workspace.name,
            orgNumber: workspace.org_number,
            plan: plan === "bedrift" ? "Bedrift" : "Start",
            interval,
            addon,
            invoiceEmail: email,
            reference: null,
            orderedBy: user.email ?? "",
            monthly: monthlyPrice(
              { plan, discount_percent: 0, discount_until: null, suspended_at: null, billing_interval: "month", accounting_addon: addon, extra_contact_packs: w?.extra_contact_packs ?? 0 },
              new Date().toISOString().slice(0, 10),
            ),
            method: "card",
          }),
        );
      }
    }
  } catch (e) {
    console.error("stripe return failed", e instanceof Error ? e.message : e);
  }
  if (ok) await flash("saved");
  redirect(ok ? "/app/abonnement?betalt=1" : "/app/abonnement?betalt=feil");
}
