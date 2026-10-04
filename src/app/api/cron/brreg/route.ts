import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { changedSince, describeChanges, lookup, pool, statusOf, type Snapshot, type WatchItem } from "@/lib/brreg-watch";

// Daily Brønnøysund watch. Called by pg_cron with a one-time ticket; the database hands out the
// organisation numbers to check and stores the results (and notifies owners about changes).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const started = new Date();
  const deadline = Date.now() + 40_000;
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("brreg_claim", { p_ticket: ticket });
  if (error || !data) return new Response(null, { status: 404 });
  const claim = data as { since: string | null; orgs: string[]; new: string[] };
  const ours = new Set(claim.orgs);

  // What changed in the registry since the last run (first run: the last day), limited to our customers.
  // Companies without a snapshot are looked up once to get a baseline (no notification for those).
  let changed: string[];
  try {
    const since = claim.since ? new Date(claim.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    changed = [...(await changedSince(since))].filter((o) => ours.has(o));
  } catch (e) {
    console.error("brreg watch: updates feed failed", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 502 });
  }
  const fresh = claim.new.filter((o) => !changed.includes(o));
  const todo = [...changed, ...fresh].slice(0, 600);

  const { data: prevData } = await db.rpc("brreg_snapshots", { p_ticket: ticket, p_orgs: changed });
  const prev = (prevData ?? {}) as Record<string, Snapshot>;

  const results = await pool(todo, 8, deadline, async (org) => ({ org, snap: await lookup(org) }));
  const items: WatchItem[] = results
    .filter((r): r is { org: string; snap: Snapshot } => !!r.snap)
    .map((r) => ({ org: r.org, snapshot: r.snap, status: statusOf(r.snap), changes: describeChanges(prev[r.org] ?? null, r.snap) }));

  // If we ran out of time before all changed companies were checked, keep the old "since" so they are retried.
  const done = new Set(results.map((r) => r.org));
  const complete = changed.every((o) => done.has(o));
  const { data: notified, error: applyErr } = await db.rpc("brreg_apply", {
    p_ticket: ticket,
    p_items: items as unknown as Json,
    p_run_started: complete ? started.toISOString() : (claim.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  });
  if (applyErr) {
    console.error("brreg watch: apply failed", applyErr.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, changed: changed.length, checked: items.length, notified });
}
