import { icsEvent } from "@/lib/ics";
import { siteUrl } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The booked meeting as a calendar file (from the confirmation page). */
export async function GET(_req: Request, ctx: RouteContext<"/booking/ics/[token]">) {
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{40}$/.test(token)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("booking_by_token", { p_token: token });
  const b = data as { starts_at: string; ends_at: string; title: string | null; company: string; cancelled: boolean } | null;
  if (!b) return new Response("Not found", { status: 404 });
  const body = icsEvent({
    uid: `${token.slice(0, 16)}@allseats.no`,
    start: b.starts_at,
    end: b.ends_at,
    title: `${b.title ?? "Møte"} – ${b.company}`,
    description: `${siteUrl()}/booking/avbestill/${token}`,
    cancelled: b.cancelled,
  });
  return new Response(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="mote.ics"' } });
}
