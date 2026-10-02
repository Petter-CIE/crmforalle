import "server-only";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteUrl } from "@/lib/session";

/**
 * E-mail notifications sent over our own SMTP (One.com, noreply@allseats.no).
 * Configure SMTP_PASSWORD (and optionally SMTP_HOST/PORT/USER/FROM) in the environment.
 * Without a password, notifications are skipped silently.
 */
function transport() {
  const pass = process.env.SMTP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "send.one.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER || "noreply@allseats.no", pass },
  });
}

const FROM = () => process.env.SMTP_FROM || "AllSeats CRM <noreply@allseats.no>";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Kind = "task" | "project";

const TEXT = {
  nb: {
    subject: (k: Kind, title: string) => (k === "task" ? `Ny oppgave til deg: ${title}` : `Du er ansvarlig for prosjektet ${title}`),
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task"
        ? `${actor} har gitt deg en oppgave i ${ws}:`
        : `${actor} har gjort deg ansvarlig for et prosjekt i ${ws}:`,
    due: "Frist",
    open: k => (k === "task" ? "Åpne oppgaver" : "Åpne prosjektet"),
    footer: "Du får denne e-posten fordi du er bruker i AllSeats CRM. Du kan slå av varsler under Konto og sikkerhet.",
    dateLocale: "nb-NO",
  },
  en: {
    subject: (k: Kind, title: string) => (k === "task" ? `New task for you: ${title}` : `You are now the lead of ${title}`),
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task" ? `${actor} assigned you a task in ${ws}:` : `${actor} made you the lead of a project in ${ws}:`,
    due: "Due",
    open: k => (k === "task" ? "Open tasks" : "Open the project"),
    footer: "You get this e-mail because you are a user of AllSeats CRM. You can turn notifications off under Account and security.",
    dateLocale: "en-GB",
  },
} satisfies Record<string, { open: (k: Kind) => string } & Record<string, unknown>>;

export type AssignmentNotice = {
  kind: Kind;
  recipientId: string | null;
  actorId: string;
  workspaceName: string;
  title: string;
  /** App path, e.g. /app/oppgaver */
  path: string;
  dueAt?: string | null;
};

/** Sends "you were assigned …" to a colleague. Never throws. */
export async function notifyAssignment(supabase: SupabaseClient<Database>, n: AssignmentNotice) {
  try {
    if (!n.recipientId || n.recipientId === n.actorId) return;
    const mailer = transport();
    if (!mailer) return;
    const { data: people } = await supabase
      .from("profiles")
      .select("id, email, full_name, locale, notify_email")
      .in("id", [n.recipientId, n.actorId]);
    const to = people?.find((p) => p.id === n.recipientId);
    const actor = people?.find((p) => p.id === n.actorId);
    if (!to || !to.notify_email || !to.email) return;

    const L = to.locale === "en" ? TEXT.en : TEXT.nb;
    const actorName = actor?.full_name || actor?.email || "AllSeats CRM";
    const url = `${siteUrl()}${n.path}`;
    const due = n.dueAt
      ? new Date(n.dueAt).toLocaleDateString(L.dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" })
      : null;
    const lead = L.lead(n.kind, actorName, n.workspaceName);

    const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td style="font-weight:bold;font-size:15px;color:#1f6f54;padding-bottom:20px">AllSeats CRM</td></tr>
<tr><td style="font-size:15px;line-height:1.5">${esc(lead)}</td></tr>
<tr><td style="padding:14px 0 4px;font-size:18px;font-weight:bold">${esc(n.title)}</td></tr>
${due ? `<tr><td style="font-size:14px;color:#52525b">${L.due}: ${esc(due)}</td></tr>` : ""}
<tr><td style="padding-top:24px"><a href="${esc(url)}" style="display:inline-block;background:#1f6f54;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold;font-size:14px">${L.open(n.kind)}</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#71717a">${L.footer}</td></tr>
</table></td></tr></table></body></html>`;
    const text = `${lead}\n\n${n.title}${due ? `\n${L.due}: ${due}` : ""}\n\n${L.open(n.kind)}: ${url}\n\n${L.footer}`;

    await mailer.sendMail({ from: FROM(), to: to.email, subject: L.subject(n.kind, n.title), text, html });
  } catch (e) {
    console.error("notifyAssignment failed", e instanceof Error ? e.message : e);
  }
}
