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

type Kind = "task" | "project" | "collab";

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
    subject: (k: Kind, title: string) =>
      k === "task"
        ? `Ny oppgave til deg: ${title}`
        : k === "collab"
          ? `Du er lagt til på oppgaven: ${title}`
          : `Du er ansvarlig for prosjektet ${title}`,
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task"
        ? `${actor} har gitt deg en oppgave i ${ws}:`
        : k === "collab"
          ? `${actor} har lagt deg til som medarbeider på en oppgave i ${ws}:`
          : `${actor} har gjort deg ansvarlig for et prosjekt i ${ws}:`,
    commentSubject: (title: string) => `Nytt notat: ${title}`,
    commentLead: (actor: string) => `${actor} skrev et notat på oppgaven:`,
    due: "Frist",
    open: (k: Kind) => (k === "project" ? "Åpne prosjektet" : "Åpne oppgaven"),
    footer: "Du får denne e-posten fordi du er bruker i AllSeats CRM. Du kan slå av varsler under Konto og sikkerhet.",
    dateLocale: "nb-NO",
  },
  en: {
    subject: (k: Kind, title: string) =>
      k === "task"
        ? `New task for you: ${title}`
        : k === "collab"
          ? `You were added to the task: ${title}`
          : `You are now the lead of ${title}`,
    lead: (k: Kind, actor: string, ws: string) =>
      k === "task"
        ? `${actor} assigned you a task in ${ws}:`
        : k === "collab"
          ? `${actor} added you as a collaborator on a task in ${ws}:`
          : `${actor} made you the lead of a project in ${ws}:`,
    commentSubject: (title: string) => `New note: ${title}`,
    commentLead: (actor: string) => `${actor} added a note to the task:`,
    due: "Due",
    open: (k: Kind) => (k === "project" ? "Open the project" : "Open the task"),
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
<tr><td style="font-size:15px;line-height:1.5;white-space:pre-line">${esc(o.lead)}</td></tr>
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

/** Sends a new task note to everyone involved (assignee, collaborators, creator, earlier commenters), except the author. Never throws. */
export async function notifyComment(
  supabase: SupabaseClient<Database>,
  n: { taskId: string; authorId: string; body: string },
) {
  try {
    const mailer = transport();
    if (!mailer) return;
    const [{ data: task }, { data: earlier }, { data: collaborators }] = await Promise.all([
      supabase.from("tasks").select("title, assignee_id, created_by").eq("id", n.taskId).maybeSingle(),
      supabase.from("task_comments").select("author_id").eq("task_id", n.taskId),
      supabase.from("task_members").select("user_id").eq("task_id", n.taskId),
    ]);
    if (!task) return;
    const ids = new Set<string>();
    for (const id of [
      task.assignee_id,
      task.created_by,
      ...(collaborators ?? []).map((c) => c.user_id),
      ...(earlier ?? []).map((c) => c.author_id),
    ])
      if (id) ids.add(id);
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

/**
 * Service notice to a company's owners and admins after a platform admin deleted its data or the whole company.
 * Bilingual (we can't read the recipients' language settings once the company is gone). Returns how many were sent.
 */
export async function notifyDeletion(n: {
  kind: "data" | "workspace";
  workspaceName: string;
  orgNumber: string | null;
  recipients: { email: string; name: string | null }[];
}) {
  const mailer = transport();
  if (!mailer) return 0;
  const date = new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" });
  const company = n.orgNumber ? `${n.workspaceName} (org.nr. ${n.orgNumber})` : n.workspaceName;
  const nb =
    n.kind === "workspace"
      ? `Som avtalt er ${company} og alle tilhørende data – kontakter, bedrifter, salg, oppgaver, prosjekter, notater, e-poster, filer og integrasjoner – slettet permanent fra AllSeats CRM ${date}. Brukerkontoen din er ikke slettet.`
      : `Som avtalt er alle data i ${company} – kontakter, bedrifter, salg, oppgaver, prosjekter, notater, e-poster, filer og integrasjoner – slettet permanent fra AllSeats CRM ${date}. Bedriften og brukerne er beholdt, så dere kan fortsatt logge inn og starte på nytt.`;
  const en =
    n.kind === "workspace"
      ? `As agreed, ${company} and all of its data – contacts, companies, deals, tasks, projects, notes, e-mails, files and integrations – was permanently deleted from AllSeats CRM on ${date}. Your user account has not been deleted.`
      : `As agreed, all data in ${company} – contacts, companies, deals, tasks, projects, notes, e-mails, files and integrations – was permanently deleted from AllSeats CRM on ${date}. The company and its users are kept, so you can still log in and start over.`;
  const title = n.kind === "workspace" ? "Bedriften er slettet / The company was deleted" : "Dataene er slettet / The data was deleted";
  const { html, text } = render({
    lead: title,
    title: n.workspaceName,
    quote: `${nb}\n\n${en}`,
    url: n.kind === "workspace" ? "mailto:post@allseats.no" : `${siteUrl()}/logg-inn`,
    button: n.kind === "workspace" ? "Kontakt oss / Contact us" : "Logg inn / Log in",
    footer:
      "Spørsmål? Svar på denne e-posten eller skriv til post@allseats.no. / Questions? Reply to this e-mail or write to post@allseats.no. – AllSeats CRM, CIE AS",
  });
  const subject =
    n.kind === "workspace"
      ? `${n.workspaceName} er slettet fra AllSeats CRM / was deleted`
      : `Dataene i ${n.workspaceName} er slettet / Your data was deleted`;
  let sent = 0;
  for (const r of n.recipients) {
    try {
      await mailer.sendMail({ from: FROM(), replyTo: "post@allseats.no", to: r.email, subject, text, html });
      sent++;
    } catch (e) {
      console.error("notifyDeletion failed", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

export type DigestUser = {
  email: string;
  name: string;
  locale: string;
  workspaces: {
    workspace: string;
    tasks: { id: string; title: string; due_at: string }[];
    stale: { id: string; title: string; value: number }[];
    quotes: { id: string; number: number; title: string; status: string }[];
  }[];
};

const DIGEST = {
  nb: {
    subject: (n: number) => `I dag: ${n} ${n === 1 ? "oppgave" : "oppgaver"} – AllSeats CRM`,
    subjectNoTasks: "Oppsummering – AllSeats CRM",
    hello: (name: string) => `God morgen, ${name}!`,
    tasks: "Oppgaver i dag og forfalte",
    overdue: "forfalt",
    today: "i dag",
    stale: "Salg uten aktivitet i 14 dager",
    quotes: "Tilbud siste døgn",
    status: { sent: "åpnet av kunden", accepted: "akseptert", rejected: "avslått" } as Record<string, string>,
    open: "Åpne AllSeats",
    footer: "Du får denne oppsummeringen hverdager kl. 7. Du kan slå den av under Konto og sikkerhet.",
    dateLocale: "nb-NO",
  },
  en: {
    subject: (n: number) => `Today: ${n} ${n === 1 ? "task" : "tasks"} – AllSeats CRM`,
    subjectNoTasks: "Summary – AllSeats CRM",
    hello: (name: string) => `Good morning, ${name}!`,
    tasks: "Tasks today and overdue",
    overdue: "overdue",
    today: "today",
    stale: "Deals without activity for 14 days",
    quotes: "Quotes in the last day",
    status: { sent: "opened by the customer", accepted: "accepted", rejected: "declined" } as Record<string, string>,
    open: "Open AllSeats",
    footer: "You get this summary on weekdays at 7. You can turn it off under Account and security.",
    dateLocale: "en-GB",
  },
};

/** Sends the morning summary to each user. Returns how many were sent. Never throws. */
export async function sendDigests(users: DigestUser[]) {
  const mailer = transport();
  if (!mailer) return 0;
  const base = siteUrl();
  const startOfToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
  startOfToday.setHours(0, 0, 0, 0);
  let sent = 0;
  for (const u of users) {
    try {
      const L = u.locale === "en" ? DIGEST.en : DIGEST.nb;
      const taskCount = u.workspaces.reduce((n, w) => n + w.tasks.length, 0);
      const multi = u.workspaces.length > 1;
      const li = (href: string, text: string, meta?: string) =>
        `<li style="margin:4px 0"><a href="${esc(href)}" style="color:#1f6f54;text-decoration:none">${esc(text)}</a>${meta ? ` <span style="color:#71717a;font-size:13px">· ${esc(meta)}</span>` : ""}</li>`;
      const section = (title: string, items: string[]) =>
        items.length ? `<p style="margin:18px 0 4px;font-weight:bold;font-size:14px">${esc(title)}</p><ul style="margin:0;padding-left:18px;font-size:14px">${items.join("")}</ul>` : "";
      const lines: string[] = [L.hello(u.name), ""];
      let body = "";
      for (const w of u.workspaces) {
        if (multi) {
          body += `<p style="margin:22px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#71717a">${esc(w.workspace)}</p>`;
          lines.push(`== ${w.workspace} ==`);
        }
        const due = (iso: string) =>
          new Date(iso) < startOfToday ? `${L.overdue} ${new Date(iso).toLocaleDateString(L.dateLocale, { day: "numeric", month: "short", timeZone: "Europe/Oslo" })}` : L.today;
        body += section(L.tasks, w.tasks.map((t) => li(`${base}/app/oppgaver/${t.id}`, t.title, due(t.due_at))));
        body += section(
          L.stale,
          w.stale.map((d) =>
            li(`${base}/app/salg/${d.id}`, d.title, new Intl.NumberFormat(L.dateLocale, { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number(d.value))),
          ),
        );
        body += section(L.quotes, w.quotes.map((q) => li(`${base}/app/tilbud/${q.id}`, `#${q.number} ${q.title}`, L.status[q.status] ?? q.status)));
        if (w.tasks.length) lines.push(L.tasks, ...w.tasks.map((t) => `- ${t.title} (${due(t.due_at)})`), "");
        if (w.stale.length) lines.push(L.stale, ...w.stale.map((d) => `- ${d.title}`), "");
        if (w.quotes.length) lines.push(L.quotes, ...w.quotes.map((q) => `- #${q.number} ${q.title}: ${L.status[q.status] ?? q.status}`), "");
      }
      const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td style="font-weight:bold;font-size:15px;color:#1f6f54;padding-bottom:16px">AllSeats CRM</td></tr>
<tr><td style="font-size:16px">${esc(L.hello(u.name))}</td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding-top:24px"><a href="${esc(base)}/app" style="display:inline-block;background:#1f6f54;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold;font-size:14px">${esc(L.open)}</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#71717a">${esc(L.footer)}</td></tr>
</table></td></tr></table></body></html>`;
      lines.push(`${L.open}: ${base}/app`, "", L.footer);
      await mailer.sendMail({
        from: FROM(),
        to: u.email,
        subject: taskCount ? L.subject(taskCount) : L.subjectNoTasks,
        text: lines.join("\n"),
        html,
      });
      sent++;
    } catch (e) {
      console.error("digest failed", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

/** Sends a quote to the customer with the PDF attached. Throws when sending fails. */
export async function sendQuoteEmail(o: {
  to: string;
  senderName: string;
  replyTo: string;
  subject: string;
  message: string;
  link: string;
  pdf: Uint8Array;
  filename: string;
}) {
  const mailer = transport();
  if (!mailer) throw new Error("smtp_not_configured");
  const { html, text } = render({
    lead: o.message,
    title: o.subject,
    url: o.link,
    button: "Se tilbudet og svar",
    footer: `Sendt av ${o.senderName} med AllSeats CRM. Svar på denne e-posten for å kontakte avsenderen.`,
  });
  await mailer.sendMail({
    from: `${o.senderName.replace(/["<>]/g, "")} via AllSeats <${process.env.SMTP_USER || "noreply@allseats.no"}>`,
    replyTo: o.replyTo,
    to: o.to,
    subject: o.subject,
    text,
    html,
    attachments: [{ filename: o.filename, content: Buffer.from(o.pdf), contentType: "application/pdf" }],
  });
}

/** Tells the seller that the customer accepted or declined a quote. Never throws. */
export async function notifyQuoteResponse(o: {
  to: string[];
  accepted: boolean;
  number: number;
  title: string;
  workspace: string;
  responder: string;
  comment: string | null;
  quoteId: string;
}) {
  try {
    const mailer = transport();
    if (!mailer || o.to.length === 0) return;
    const verb = o.accepted ? "akseptert" : "avslått";
    const { html, text } = render({
      lead: `${o.responder} har ${verb} tilbud #${o.number} i ${o.workspace}:`,
      title: o.title,
      quote: o.comment ?? undefined,
      url: `${siteUrl()}/app/tilbud/${o.quoteId}`,
      button: "Åpne tilbudet",
      footer: "Du får denne e-posten fordi du sendte tilbudet eller er ansvarlig for salget.",
    });
    await mailer.sendMail({
      from: FROM(),
      to: o.to,
      subject: `${o.accepted ? "✅ Akseptert" : "Avslått"}: tilbud #${o.number} ${o.title}`,
      text,
      html,
    });
  } catch (e) {
    console.error("notifyQuoteResponse failed", e instanceof Error ? e.message : e);
  }
}
