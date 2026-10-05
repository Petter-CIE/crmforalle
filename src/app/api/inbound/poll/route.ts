import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { addresses, DOMAIN, forwardedFrom, htmlToText, tokensOf } from "@/lib/inbound-mail";
import type { Database } from "@/lib/database.types";

// Reads the One.com catch-all mailbox and files mail sent (or auto-forwarded) to crm-<token>@allseats.no.
// Called every minute by pg_cron. It needs no secret: anyone calling it only makes the CRM
// check the mailbox sooner, and a database lock keeps it to one run per 40 seconds.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PER_RUN = 40;

export async function GET() {
  const password = process.env.IMAP_PASSWORD;
  if (!password) return new Response(null, { status: 204 });

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: gotLock } = await db.rpc("inbound_try_lock");
  if (!gotLock) return Response.json({ skipped: true });

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.one.com",
    port: 993,
    secure: true,
    auth: { user: process.env.IMAP_USER ?? `crm@${DOMAIN}`, pass: password },
    logger: false,
  });

  const stats = { read: 0, filed: 0, ignored: 0, failed: 0 };
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = ((await client.search({ seen: false }, { uid: true })) || []).slice(0, MAX_PER_RUN);
      const done: number[] = [];
      const skip: number[] = [];
      for (const uid of uids) {
        stats.read++;
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const raw = msg.source.toString("utf8");
        const tokens = tokensOf(raw);
        if (tokens.length === 0) {
          // not for the CRM (e.g. a typo to another address on the domain): leave it, but don't read it again
          skip.push(uid);
          stats.ignored++;
          continue;
        }
        const mail = await simpleParser(msg.source);
        // Automatic forwarding (e.g. a Gmail filter) sends everything: keep only mail with known contacts.
        const auto = mail.headers.has("x-forwarded-to") || mail.headers.has("x-forwarded-for");
        const from = addresses(mail.from)[0];
        const text = (mail.text?.trim() || (mail.html ? htmlToText(mail.html) : "")).slice(0, 20000);
        const attachments = mail.attachments.filter((a) => a.contentDisposition === "attachment").map((a) => a.filename || "?");
        const body = attachments.length ? `${text}\n\n📎 ${attachments.join(", ")}` : text;
        let ok = true;
        for (const token of tokens) {
          const { error } = await db.rpc("ingest_inbound_email", {
            p_token: token,
            p_message_id: mail.messageId ?? null,
            p_from_email: from?.email ?? "",
            p_from_name: from?.name ?? null,
            p_to: addresses(mail.to).map((a) => a.email),
            p_cc: addresses(mail.cc).map((a) => a.email),
            p_forwarded_from: forwardedFrom(text),
            p_subject: mail.subject ?? null,
            p_body: body,
            p_sent_at: (mail.date ?? new Date()).toISOString(),
            p_auto: auto,
          });
          if (error) ok = false;
        }
        if (ok) {
          done.push(uid);
          stats.filed++;
        } else stats.failed++; // stays unread and is tried again next minute
      }
      if (skip.length) await client.messageFlagsAdd(skip.join(","), ["\\Seen"], { uid: true });
      if (done.length) await client.messageDelete(done.join(","), { uid: true });
    } finally {
      lock.release();
    }
  } catch (e) {
    console.error("inbound poll failed", e instanceof Error ? e.message : e);
    return Response.json({ ...stats, error: true }, { status: 500 });
  } finally {
    await client.logout().catch(() => {});
  }
  return Response.json(stats);
}
