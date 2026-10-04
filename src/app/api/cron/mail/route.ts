import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { busyTimes, messagesSince, me, microsoftEnabled, refreshAccess, type SyncedMessage } from "@/lib/microsoft";
import { open, seal } from "@/lib/secret-box";

// Every 15 minutes (pg_cron → ticket): reads new mail and calendar busy times for each connected
// Outlook account. The database keeps only mail exchanged with existing contacts.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Conn = { id: string; parent_id: string | null; mailbox: string | null; refresh_token: string; mail: boolean; calendar: boolean; synced_until: string; user_email: string | null };

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  if (!microsoftEnabled()) return Response.json({ ok: false, reason: "not_configured" });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("mail_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const conns = (Array.isArray(data) ? data : []) as unknown as Conn[];
  const started = Date.now();
  let linked = 0;
  // Access tokens of the users' own connections, reused for their shared mailboxes (listed after them).
  const access = new Map<string, string>();

  for (const c of conns) {
    if (Date.now() - started > 45_000) break; // the rest waits for the next run
    const result: { refresh_token?: string; synced_until?: string; account_email?: string; error?: string; busy?: [string, string][]; messages?: SyncedMessage[] } = {};
    try {
      let at: string;
      if (c.parent_id) {
        const parent = access.get(c.parent_id);
        if (!parent) throw new Error("the main mailbox could not be synchronised");
        at = parent;
      } else {
        const tokens = await refreshAccess(open(c.refresh_token));
        if (tokens.refresh_token) result.refresh_token = seal(tokens.refresh_token);
        at = tokens.access_token;
        access.set(c.id, at);
      }
      if (c.mail) {
        // Overlap a little so nothing at the edge is missed; duplicates are skipped by message id.
        const since = new Date(new Date(c.synced_until).getTime() - 10 * 60_000).toISOString();
        const now = new Date().toISOString();
        const [inbox, sent] = await Promise.all([messagesSince(at, "inbox", since, 200, c.mailbox), messagesSince(at, "sentitems", since, 200, c.mailbox)]);
        result.messages = [...inbox, ...sent];
        result.synced_until = now;
        if (!c.user_email && !c.parent_id) result.account_email = await me(at).catch(() => "");
      }
      if (c.calendar && !c.parent_id) result.busy = await busyTimes(at);
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
      console.error("mail sync failed", c.id, result.error);
    }
    const { data: n, error: applyErr } = await db.rpc("mail_apply", { p_ticket: ticket, p_connection: c.id, p_result: result as unknown as Json });
    if (applyErr) console.error("mail_apply failed", applyErr.message);
    else linked += Number(n) || 0;
  }
  return Response.json({ ok: true, connections: conns.length, linked });
}
