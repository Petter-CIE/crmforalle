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

type Lang = {
  subject: (k: Kind, title: string) => string;
  lead: (k: Kind, actor: string, ws: string) => string;
  commentSubject: (title: string) => string;
  commentLead: (actor: string) => string;
  due: string;
  open: (k: Kind) => string;
  footer: string;
  dateLocale: string;
};

const TEXT: Record<"nb" | "en", Lang> = {
  nb: {
    subject: (k: Kind, title: string) => (k === "task" ? `Ny oppgave til deg: ${title}` : `Du er ansvarlig for prosjektet ${title}`),
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task"
        ? `${actor} har gitt deg en oppgave i ${ws}:`
        : `${actor} har gjort deg ansvarlig for et prosjekt i ${ws}:`,
    commentSubject: (title: string) => `Nytt notat: ${title}`,
    commentLead: (actor: string) => `${actor} skrev et notat på oppgaven:`,
    due: "Frist",
    open: (k: Kind) => (k === "task" ? "Åpne oppgaven" : "Åpne prosjektet"),
    footer: "Du får denne e-posten fordi du er bruker i AllSeats CRM. Du kan slå av varsler under Konto og sikkerhet.",
    dateLocale: "nb-NO",
  },
  en: {
    subject: (k: Kind, title: string) => (k === "task" ? `New task for you: ${title}` : `You are now the lead of ${title}`),
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task" ? `${actor} assigned you a task in ${ws}:` : `${actor} made you the lead of a project in ${ws}:`,
    commentSubject: (title: string) => `New note: ${title}`,
    commentLead: (actor: string) => `${actor} added a note to the task:`,
    due: "Due",
    open: (k: Kind) => (k === "task" ? "Open the task" : "Open the project"),
    footer: "You get this e-mail because you are a user of AllSeats CRM. You can turn notifications off under Account and security.",
    dateLocale: "en-GB",
  },
};


function render(o: { lead: string; title: string; quote?: string; meta?: string; url: string; button: string; footer: string }) {
  const quote = o.quote && o.quote.length > 1500 ? `${o.quote.slice(0, 1500)} …` : o.quote;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td style="font-weight:bold;font-size:15px;color:#1f6f54;padding-bottom:20px">AllSeats CRM</td></tr>
<tr><td style="font-size:15px;line-height:1.5">${esc(o.lead)}</td></tr>
<tr><td style="padding:14px 0 4px;font-size:18px;font-weight:bold">${esc(o.title)}</td></tr>
${o.meta ? `<tr><td style="font-size:14px;color:#52525b">${esc(o.meta)}</td></tr>` : ""}
${quote ? `<tr><td style="padding-top:14px"><div style="border-left:3px solid #1f6f54;background:#f4f4f5;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(quote)}</div></td></tr>` : ""}
<tr><td style="padding-top:24px"><a href="${esc(o.url)}" style="display:inline-block;background:#1f6f54;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold;font-size:14px">${esc(o.button)}</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#71717a">${esc(o.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [o.lead, "", o.title, o.meta, quote ? `\n${quote}` : "", "", `${o.button}: ${o.url}`, "", o.footer]
    .filter((l) => l !== undefined)
    .join("\n");
  return { html, text };
}

type Person = { id: string; email: string; full_name: string | null; locale: string; notify_email: boolean };

async function people(supabase: SupabaseClient<Database>, ids: string[]) {
  const { data } = await supabase.from("profiles").select("id, email, full_name, locale, notify_email").in("id", ids);
  return (data ?? []) as Person[];
}
const display = (p?: Person) => p?.full_name || p?.email || "AllSeats CRM";
const lang = (p: Person): Lang => (p.locale === "en" ? TEXT.en : TEXT.nb);

export type AssignmentNotice = {
  kind: Kind;
  recipientId: string | null;
  actorId: string;
  workspaceName: string;
  title: string;
  /** App path, e.g. /app/oppgaver/<id> */
  path: string;
  dueAt?: string | null;
};

/** Sends "you were assigned …" to a colleague. Never throws. */
export async function notifyAssignment(supabase: SupabaseClient<Database>, n: AssignmentNotice) {
  try {
    if (!n.recipientId || n.recipientId === n.actorId) return;
    const mailer = transport();
    if (!mailer) return;
    const list = await people(supabase, [n.recipientId, n.actorId]);
    const to = list.find((p) => p.id === n.recipientId);
    if (!to || !to.notify_email || !to.email) return;
    const L = lang(to);
    const due = n.dueAt
      ? new Date(n.dueAt).toLocaleDateString(L.dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" })
      : null;
    const { html, text } = render({
      lead: L.lead(n.kind, display(list.find((p) => p.id === n.actorId)), n.workspaceName),
      title: n.title,
      meta: due ? `${L.due}: ${due}` : undefined,
      url: `${siteUrl()}${n.path}`,
      button: L.open(n.kind),
      footer: L.footer,
    });
    await mailer.sendMail({ from: FROM(), to: to.email, subject: L.subject(n.kind, n.title), text, html });
  } catch (e) {
    console.error("notifyAssignment failed", e instanceof Error ? e.message : e);
  }
}

/** Sends a new task note to everyone involved (assignee, creator, earlier commenters), except the author. Never throws. */
export async function notifyComment(
  supabase: SupabaseClient<Database>,
  n: { taskId: string; authorId: string; body: string },
) {
  try {
    const mailer = transport();
    if (!mailer) return;
    const [{ data: task }, { data: earlier }] = await Promise.all([
      supabase.from("tasks").select("title, assignee_id, created_by").eq("id", n.taskId).maybeSingle(),
      supabase.from("task_comments").select("author_id").eq("task_id", n.taskId),
    ]);
    if (!task) return;
    const ids = new Set<string>();
    for (const id of [task.assignee_id, task.created_by, ...(earlier ?? []).map((c) => c.author_id)]) if (id) ids.add(id);
    ids.delete(n.authorId);
    if (ids.size === 0) return;
    const list = await people(supabase, [...ids, n.authorId]);
    const author = display(list.find((p) => p.id === n.authorId));
    const url = `${siteUrl()}/app/oppgaver/${n.taskId}`;
    for (const to of list) {
      if (to.id === n.authorId || !ids.has(to.id) || !to.notify_email || !to.email) continue;
      const L = lang(to);
      const { html, text } = render({
        lead: L.commentLead(author),
        title: task.title,
        quote: n.body,
        url,
        button: L.open("task"),
        footer: L.footer,
      });
      await mailer.sendMail({ from: FROM(), to: to.email, subject: L.commentSubject(task.title), text, html });
    }
  } catch (e) {
    console.error("notifyComment failed", e instanceof Error ? e.message : e);
  }
}
