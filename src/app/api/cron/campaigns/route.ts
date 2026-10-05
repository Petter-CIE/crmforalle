import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { brevoDailyLimit, brevoEnabled, sendBrevo } from "@/lib/brevo";
import { renderCampaign } from "@/lib/campaign-render";
import { SITE_URL } from "@/lib/site-url";

// Every 2 minutes while campaign e-mails are queued (pg_cron → ticket): sends the next batch
// through Brevo and reports the result. The database caps the batch at the Brevo daily limit.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 60;

type Item = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  token: string;
  campaign_id: string;
  subject: string;
  body: string;
  workspace_name: string;
  workspace_address: string | null;
  reply_to: string | null;
  reply_name: string | null;
};

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  if (!brevoEnabled()) return Response.json({ ok: false, reason: "not_configured" });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("campaign_claim", { p_ticket: ticket, p_limit: BATCH, p_daily_cap: brevoDailyLimit() });
  if (error) return new Response(null, { status: 404 });
  const items = (Array.isArray(data) ? data : []) as unknown as Item[];
  const results: { id: string; ok: boolean; error?: string }[] = [];
  const started = Date.now();

  for (const it of items) {
    if (Date.now() - started > 45_000) break; // the rest is handed out again later
    const unsubscribeUrl = `${SITE_URL}/avmelding/${it.token}`;
    const mail = renderCampaign(
      it.subject,
      it.body,
      it,
      { company: it.workspace_name, address: it.workspace_address, unsubscribeUrl, unsubscribeLabel: "Meld deg av", why: "Du får denne e-posten fra" },
      `${SITE_URL}/api/kampanje/apnet/${it.token}`,
    );
    try {
      await sendBrevo({
        to: it.email,
        toName: [it.first_name, it.last_name].filter(Boolean).join(" ") || null,
        fromName: it.workspace_name,
        replyTo: it.reply_to ? { email: it.reply_to, name: it.reply_name } : null,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        unsubscribeUrl: `${SITE_URL}/api/kampanje/avmeld/${it.token}`,
        tag: `campaign-${it.campaign_id}`,
      });
      results.push({ id: it.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("campaign send failed", it.id, msg);
      results.push({ id: it.id, ok: false, error: msg });
    }
  }

  const { error: repErr } = await db.rpc("campaign_report", { p_ticket: ticket, p_results: results as unknown as Json });
  if (repErr) console.error("campaign_report failed", repErr.message);
  return Response.json({ ok: true, claimed: items.length, sent: results.filter((r) => r.ok).length });
}
