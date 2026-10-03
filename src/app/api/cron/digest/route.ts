import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendDigests, type DigestUser } from "@/lib/notify";

// Morning summary e-mails. Called by pg_cron on weekdays at 07:00 Oslo time with a one-time ticket
// that only the database knows; without a valid ticket the database returns nothing.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("digest_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const users = (Array.isArray(data) ? data : []) as unknown as DigestUser[];
  const sent = await sendDigests(users);
  return Response.json({ users: users.length, sent });
}
