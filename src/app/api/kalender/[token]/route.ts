import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteUrl } from "@/lib/session";
import { icsEscape as esc, icsFold as fold, icsStamp as stamp } from "@/lib/ics";

// Personal calendar feed (iCalendar) with the user's tasks. The secret token in the URL is the only key,
// so calendar apps (Google, Outlook, Apple) can subscribe without logging in.

export const dynamic = "force-dynamic";

type Item = { id: string; title: string; description: string | null; due_at: string; done: boolean; updated_at: string; workspace: string; related: string | null };

export async function GET(_req: Request, ctx: RouteContext<"/api/kalender/[token]">) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{40}$/.test(token)) return new Response("Not found", { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await db.rpc("calendar_feed", { p_token: token });
  if (!data) return new Response("Not found", { status: 404 });
  const items = data as unknown as Item[];
  const base = siteUrl();
  const now = stamp(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AllSeats CRM//Oppgaver//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AllSeats – oppgaver",
    "X-WR-TIMEZONE:Europe/Oslo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const it of items) {
    const start = new Date(it.due_at);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const url = `${base}/app/oppgaver/${it.id}`;
    const desc = [it.related, it.workspace, it.description, url].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.id}@allseats.no`,
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${stamp(it.updated_at)}`,
      `DTSTART:${stamp(start.toISOString())}`,
      `DTEND:${stamp(end.toISOString())}`,
      `SUMMARY:${esc((it.done ? "✓ " : "") + it.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `URL:${url}`,
      `STATUS:${it.done ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="allseats.ics"',
      "cache-control": "private, max-age=300",
    },
  });
}
