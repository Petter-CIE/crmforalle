import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { inboundSecret } from "@/lib/brevo";
import type { Database } from "@/lib/database.types";
import { forwardedFrom, htmlToText, tokensFromAddresses } from "@/lib/inbound-mail";

// Brevo receives mail for crm-<token>@inn.allseats.no (MX → Brevo), parses it and posts it here.
// The URL carries a secret derived from the Brevo API key; requests without it are refused.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Addr = { Address?: string | null; Name?: string | null } | null | undefined;
type Item = {
  MessageId?: string | null;
  From?: Addr;
  To?: Addr[] | null;
  Cc?: Addr[] | null;
  Recipients?: string[] | null;
  SentAtDate?: string | null;
  Subject?: string | null;
  RawTextBody?: string | null;
  RawHtmlBody?: string | null;
  Attachments?: { Name?: string | null }[] | null;
  Headers?: Record<string, string | string[]> | null;
};

const email = (a: Addr) => (a?.Address ?? "").trim().toLowerCase();

function secretOk(given: string | null) {
  const want = inboundSecret();
  if (!want || !given || given.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

export async function POST(req: Request) {
  if (!secretOk(new URL(req.url).searchParams.get("key"))) return new Response(null, { status: 401 });

  const payload = (await req.json().catch(() => null)) as { items?: Item[] } | null;
  const items = payload?.items ?? [];
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });

  const stats = { read: 0, filed: 0, ignored: 0, failed: 0 };
  for (const m of items.slice(0, 50)) {
    stats.read++;
    const to = (m.To ?? []).map(email).filter(Boolean);
    const cc = (m.Cc ?? []).map(email).filter(Boolean);
    // Recipients are the envelope addresses, so a BCC to the CRM address shows up there.
    const tokens = tokensFromAddresses([...(m.Recipients ?? []), ...to, ...cc]);
    if (tokens.length === 0) {
      stats.ignored++;
      continue;
    }
    const headers = Object.fromEntries(Object.entries(m.Headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    // Automatic forwarding (e.g. a Gmail filter) sends everything: only mail with known contacts is kept.
    const auto = "x-forwarded-to" in headers || "x-forwarded-for" in headers;
    const text = (m.RawTextBody?.trim() || (m.RawHtmlBody ? htmlToText(m.RawHtmlBody) : "")).slice(0, 20000);
    const files = (m.Attachments ?? []).map((a) => a.Name || "?");
    const body = files.length ? `${text}\n\n📎 ${files.join(", ")}` : text;
    const sent = m.SentAtDate && !Number.isNaN(Date.parse(m.SentAtDate)) ? new Date(m.SentAtDate) : new Date();

    let ok = true;
    for (const token of tokens) {
      const { error } = await db.rpc("ingest_inbound_email", {
        p_token: token,
        p_message_id: m.MessageId ?? null,
        p_from_email: email(m.From),
        p_from_name: m.From?.Name || null,
        p_to: to,
        p_cc: cc,
        p_forwarded_from: forwardedFrom(text),
        p_subject: m.Subject ?? null,
        p_body: body,
        p_sent_at: sent.toISOString(),
        p_auto: auto,
      });
      if (error) {
        ok = false;
        console.error("inbound ingest failed", error.message);
      }
    }
    if (ok) stats.filed++;
    else stats.failed++;
  }

  // A failure asks Brevo to try again later; the database ignores a message it has already filed.
  return Response.json(stats, { status: stats.failed > 0 && stats.filed === 0 ? 500 : 200 });
}
