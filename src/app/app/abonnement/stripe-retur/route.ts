import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { flash } from "@/lib/flash";
import { canManage, requireWorkspace } from "@/lib/session";
import { cardPaymentsEnabled } from "@/lib/stripe";

/**
 * Back from Stripe Checkout. The browser cannot activate anything itself: it asks the database to
 * start a server-side check (the database calls /api/cron/stripe-activate with a one-time ticket,
 * which verifies the session with Stripe). Here we just wait a few seconds for the result.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  const { supabase, workspace } = await requireWorkspace();
  if (!cardPaymentsEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !canManage(workspace.role)) redirect("/app/abonnement");

  const { error } = await supabase.rpc("card_checkout_verify", { p_workspace: workspace.id, p_session: sessionId });
  if (error) {
    console.error("card_checkout_verify failed", error.message);
    redirect("/app/abonnement?betalt=feil");
  }

  let ok = false;
  for (let i = 0; i < 16 && !ok; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const { data: w } = await supabase.from("workspaces").select("payment_method, card_status, ordered_at").eq("id", workspace.id).single();
    ok = w?.payment_method === "card" && w.card_status === "active" && !!w.ordered_at && Date.now() - new Date(w.ordered_at).getTime() < 5 * 60_000;
  }
  if (ok) {
    await flash("saved");
    redirect("/app/abonnement?betalt=1");
  }
  // Still being checked (or Stripe was slow): the page offers to check again.
  redirect(`/app/abonnement?betalt=venter&session_id=${encodeURIComponent(sessionId)}`);
}
