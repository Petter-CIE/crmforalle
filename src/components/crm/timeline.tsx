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

type Scope = { company_id?: string | null; contact_id?: string | null; deal_id?: string | null };

/** Notes + system events for a company, contact or deal, with a form to add a note. */
export async function Timeline({ filter, links, path }: { filter: Scope; links: Scope; path: string }) {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();

  let q = supabase
    .from("activities")
    .select("id, type, body, occurred_at, author_id, profiles(full_name, email)")
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
                {a.profiles && (
                  <span className="inline-flex items-center gap-1">
                    {t.crm.by}
                    <Avatar name={a.profiles.full_name || a.profiles.email} size="xs" />
                    {a.profiles.full_name || a.profiles.email}
                  </span>
                )}
                {a.author_id === user.id && !system(a.type) && (
                  <DeleteButton kind="note" id={a.id} message={t.ui.deleted.note} variant="ghost" className="ml-auto !px-1 !py-0 text-xs">
                    {t.crm.delete}
                  </DeleteButton>
                )}
              </div>
              {!system(a.type) && a.body && <p className="mt-1 whitespace-pre-wrap text-sm">{a.body}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
