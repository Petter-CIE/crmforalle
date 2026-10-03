import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Select } from "@/components/ui";
import { EmptyState, Textarea } from "@/components/ui-extra";
import { addNote, deleteNote } from "@/app/app/crm-actions";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

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
        <ol className="space-y-3 border-l border-border pl-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${
                  a.type === "won" ? "bg-brand" : a.type === "lost" ? "bg-danger" : system(a.type) ? "bg-muted/50" : "bg-sky-500"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                <span className="font-medium text-foreground">{label(a.type)}</span>
                {(a.type === "created" || a.type === "stage_change") && a.body && <span className="text-foreground">{a.body}</span>}
                <span>{formatDateTime(a.occurred_at, dateLocale)}</span>
                {a.profiles && (
                  <span>
                    {t.crm.by} {a.profiles.full_name || a.profiles.email}
                  </span>
                )}
                {a.author_id === user.id && !system(a.type) && (
                  <form action={deleteNote} className="ml-auto">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="tilbake" value={path} />
                    <ConfirmButton message={t.crm.confirmDelete} variant="ghost" className="!px-1 !py-0 text-xs">
                      {t.crm.delete}
                    </ConfirmButton>
                  </form>
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
