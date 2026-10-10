import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { Select } from "@/components/ui";
import { EmptyState, Textarea } from "@/components/ui-extra";
import { addNote } from "@/app/app/crm-actions";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

/** Emoji per activity type, also used on the "Today" page. */
export const ACTIVITY_ICON: Record<string, string> = { note: "📝", call: "📞", meeting: "🤝", email: "✉️", created: "✨", stage_change: "➡️", won: "🏆", lost: "✖️", lead: "🌐", brreg: "🏛️", email_sent: "📤" };

const EMAIL_TYPES = ["email", "email_sent"];

/** E-mails start with the subject line; the rest opens on click so long mails don't flood the timeline. */
function EmailBody({ body }: { body: string }) {
  const [subject, ...rest] = body.split("\n");
  const content = rest.join("\n").trim();
  if (!content) return <p className="mt-1 text-sm font-medium">{subject}</p>;
  return (
    <details className="group mt-1">
      <summary className="flex cursor-pointer list-none items-start gap-1.5 text-sm font-medium hover:text-brand [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="mt-0.5 text-xs text-muted transition-transform group-open:rotate-90">▶</span>
        <span>{subject}</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm">{content}</p>
    </details>
  );
}

type Scope = { company_id?: string | null; contact_id?: string | null; deal_id?: string | null };

/** Notes + system events for a company, contact or deal, with a form to add a note. */
export async function Timeline({ filter, links, path }: { filter: Scope; links: Scope; path: string }) {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();

  let q = supabase
    .from("activities")
    .select("id, type, body, occurred_at, author_id, deal_id, profiles(full_name, email), projects(name, color)")
    .eq("workspace_id", workspace.id)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (filter.deal_id) q = q.eq("deal_id", filter.deal_id);
  else if (filter.contact_id) q = q.eq("contact_id", filter.contact_id);
  else if (filter.company_id) q = q.eq("company_id", filter.company_id);
  const { data: items } = await q;

  const label = (type: string) =>
    (t.crm.noteTypes as Record<string, string>)[type] ?? (t.crm.activity as Record<string, string>)[type] ?? type;
  const system = (type: string) => ["created", "stage_change", "won", "lost"].includes(type);

  return (
    <div className="space-y-5">
      <ActionForm
        action={addNote}
        submitLabel={t.crm.addNote}
        pendingLabel={t.crm.saving}
        resetOnSuccess
        className="space-y-2"
      >
        <input type="hidden" name="tilbake" value={path} />
        {links.company_id && <input type="hidden" name="company_id" value={links.company_id} />}
        {links.contact_id && <input type="hidden" name="contact_id" value={links.contact_id} />}
        {links.deal_id && <input type="hidden" name="deal_id" value={links.deal_id} />}
        <Textarea id="notat" name="body" rows={3} placeholder={t.crm.notePlaceholder} aria-label={t.crm.addNote} required />
        <Select name="type" defaultValue="note" aria-label={t.crm.timeline}>
          {Object.entries(t.crm.noteTypes).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </ActionForm>

      {!items || items.length === 0 ? (
        <EmptyState>{t.crm.noActivity}</EmptyState>
      ) : (
        <ol className="ml-3 space-y-4 border-l border-border pl-6">
          {items.map((a) => (
            <li key={a.id} data-del={a.id} className="relative">
              <span
                aria-hidden
                className={`absolute -left-9 top-0 grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                  a.type === "won"
                    ? "border-brand/30 bg-brand-soft"
                    : a.type === "lost"
                      ? "border-red-200 bg-red-50"
                      : "border-border bg-surface"
                }`}
              >
                {ACTIVITY_ICON[a.type] ?? "•"}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                <span className="font-medium text-foreground">{label(a.type)}</span>
                {(a.type === "created" || a.type === "stage_change") && a.body && <span className="text-foreground">{a.body}</span>}
                <span>{formatDateTime(a.occurred_at, dateLocale)}</span>
                {a.projects && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-[11px] text-foreground">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: a.projects.color }} />
                    {a.projects.name}
                  </span>
                )}
                {a.profiles && (
                  <span className="inline-flex items-center gap-1">
                    {t.crm.by}
                    <Avatar name={a.profiles.full_name || a.profiles.email} size="xs" />
                    {a.profiles.full_name || a.profiles.email}
                  </span>
                )}
                {a.type === "email" && !a.deal_id && !filter.deal_id && (
                  <Link
                    href={`/app/salg/henvendelse?aktivitet=${a.id}`}
                    title={t.deals.inquiry.fromThisEmailTitle}
                    className="rounded-full border border-border px-2 py-px text-[11px] font-medium text-brand hover:bg-brand-soft"
                  >
                    + {t.deals.inquiry.fromThisEmail}
                  </Link>
                )}
                {a.author_id === user.id && !system(a.type) && (
                  <DeleteButton kind="note" id={a.id} message={t.ui.deleted.note} variant="ghost" className="ml-auto !px-1 !py-0 text-xs">
                    {t.crm.delete}
                  </DeleteButton>
                )}
              </div>
              {!system(a.type) && a.body && (EMAIL_TYPES.includes(a.type) ? <EmailBody body={a.body} /> : <p className="mt-1 whitespace-pre-wrap text-sm">{a.body}</p>)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
