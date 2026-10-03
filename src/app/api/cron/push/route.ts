import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendPushBatch, type PushMessage } from "@/lib/push";

// Sends queued push notifications. Called by pg_cron (only when something is waiting) with a one-time
// ticket that only the database knows; without a valid ticket the database returns nothing.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("push_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const batch = (Array.isArray(data) ? data : []) as unknown as (PushMessage & { subs: { endpoint: string; p256dh: string; auth: string }[] })[];
  const { sent, gone } = await sendPushBatch(batch);
  if (gone.length) await db.rpc("push_gone", { p_ticket: ticket, p_endpoints: gone });
  return Response.json({ messages: batch.length, sent, gone: gone.length });
}
