import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendTrialMails } from "@/lib/notify";

// Trial reminders, called by pg_cron every morning with a one-time ticket.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("trial_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const items = (Array.isArray(data) ? data : []) as unknown as Parameters<typeof sendTrialMails>[0];
  const sent = await sendTrialMails(items);
  return Response.json({ workspaces: items.length, sent });
}
