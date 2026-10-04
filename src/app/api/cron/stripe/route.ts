import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { getStripe, periodEnd } from "@/lib/stripe";

// Daily: asks Stripe for the status of every card subscription (renewed, card failed, cancelled …).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const stripe = getStripe();
  if (!stripe) return Response.json({ ok: false, reason: "not_configured" });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("stripe_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const subs = (Array.isArray(data) ? data : []) as { workspace_id: string; subscription: string }[];

  const items: { workspace_id: string; subscription: string; status: string; period_end: string | null }[] = [];
  for (const s of subs) {
    try {
      const sub = await stripe.subscriptions.retrieve(s.subscription);
      items.push({ ...s, status: sub.status, period_end: periodEnd(sub) });
    } catch (e) {
      // A subscription Stripe doesn't know (e.g. deleted) counts as cancelled.
      const code = (e as { code?: string }).code;
      if (code === "resource_missing") items.push({ ...s, status: "canceled", period_end: null });
      else console.error("stripe sync failed", s.subscription, e instanceof Error ? e.message : e);
    }
  }
  const { data: ended, error: applyErr } = await db.rpc("stripe_apply", { p_ticket: ticket, p_items: items as unknown as Json });
  if (applyErr) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, checked: items.length, ended });
}
