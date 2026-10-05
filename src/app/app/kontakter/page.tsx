import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BulkBar, RowCheckbox, SelectAll } from "@/components/crm/bulk-bar";
import { ListFilterForm } from "@/components/crm/list-filter-form";
import { ProjectChips } from "@/components/crm/project-chips";
import { SavedViews } from "@/components/crm/saved-views";
import { ButtonLink, Card } from "@/components/ui";
import { EmptyHero, PageHeader } from "@/components/ui-extra";
import { contactName, formatDate, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { filterQuery, inactiveSince, parseFilters, safeLike } from "@/lib/list-filters";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.contacts.title };
}

const FORM_ID = "bulk-contacts";

export default async function ContactsPage({ searchParams }: PageProps<"/app/kontakter">) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const query = f.q;
  const projectId = f.project;
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t, dateLocale } = await getI18n();

  const join = projectId ? "project_contacts!inner(project_id)" : "project_contacts(project_id)";
  let req = supabase
    .from("contacts")
    .select(`id, first_name, last_name, email, phone, title, last_activity_at, companies(id, name), ${join}`)
    .eq("workspace_id", workspace.id)
    .order("first_name")
    .limit(1000);
  if (projectId) req = req.eq("project_contacts.project_id", projectId);
  if (f.owner) req = f.owner === "ingen" ? req.is("owner_id", null) : req.eq("owner_id", f.owner);
  if (f.city) req = req.ilike("city", `%${safeLike(f.city)}%`);
  if (f.inactive) req = req.or(`last_activity_at.is.null,last_activity_at.lt.${inactiveSince(f.inactive)}`);
  if (f.consent) req = req.eq("marketing_consent", true);
  if (f.kind) req = req.eq("kind", f.kind);
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    req = req.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const [{ data: contacts }, { data: projects }, members, { data: views }] = await Promise.all([
    req,
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .order("name"),
    listMembers(ctx),
    supabase.from("saved_views").select("id, name, query, shared, user_id").eq("workspace_id", workspace.id).eq("entity", "contacts").order("name"),
  ]);
  const current = filterQuery(f);
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.contacts.title}
        actions={
          <>
            <ButtonLink href="/app/duplikater?type=kontakter" variant="ghost">
              {t.dupes.title}
            </ButtonLink>
            <ButtonLink href="/app/import" variant="secondary">
              {t.import.button}
            </ButtonLink>
            <ButtonLink href={projectId ? `/app/kontakter/ny?prosjekt=${projectId}` : "/app/kontakter/ny"}>
              + {t.contacts.new}
            </ButtonLink>
          </>
        }
      />
      <ListFilterForm
        f={f}
        base="/app/kontakter"
        projects={projects ?? []}
        members={members}
        consent={true}
        t={{
          search: t.crm.search,
          searchPlaceholder: t.contacts.searchPlaceholder,
          allProjects: t.contacts.allProjects,
          filter: t.contacts.filter,
          owner: t.views.owner,
          anyOwner: t.views.anyOwner,
          noOwner: t.views.noOwner,
          city: t.views.city,
          anyActivity: t.views.anyActivity,
          inactiveDays: t.views.inactiveDays,
          consentYes: t.views.consentYes,
          reset: t.views.reset,
          kinds: { any: t.views.anyKind, b2b: t.contacts.kindB2b, b2c: t.contacts.kindB2c },
        }}
      />
      <SavedViews
        entity="contacts"
        base="/app/kontakter"
        current={current}
        views={(views ?? []).map((v) => ({ id: v.id, name: v.name, query: v.query, shared: v.shared, mine: v.user_id === ctx.user.id }))}
        t={{
          title: t.views.title,
          all: t.views.all,
          save: t.views.save,
          namePlaceholder: t.views.namePlaceholder,
          shared: t.views.shared,
          saveBtn: t.views.saveBtn,
          remove: t.views.remove,
          sharedBadge: t.views.sharedBadge,
        }}
      />
      {!contacts || contacts.length === 0 ? (
        current ? (
          <EmptyHero icon="search" title={t.ui.empty.noResults} text={t.ui.empty.noResultsText} />
        ) : (
          <EmptyHero
            icon="contacts"
            title={t.ui.empty.contactsTitle}
            text={t.ui.empty.contactsText}
            actions={
              <>
                <ButtonLink href="/app/kontakter/ny">+ {t.ui.empty.contactsAction}</ButtonLink>
                <ButtonLink href="/app/import" variant="secondary">
                  {t.ui.empty.importAction}
                </ButtonLink>
              </>
            }
          />
        )
      ) : (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="w-10 py-2 pl-4">
                  <SelectAll formId={FORM_ID} label={t.bulk.selectAll} />
                </th>
                <th className="px-3 py-2 font-medium">{t.companies.name}</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">{t.contacts.company}</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">{t.contacts.projects}</th>
                <th className="hidden px-4 py-2 font-medium lg:table-cell">
                  {t.contacts.phone} / {t.contacts.email}
                </th>
                <th className="hidden px-4 py-2 font-medium xl:table-cell">{t.views.lastActivity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((k) => (
                <tr key={k.id} data-del={k.id} className="relative hover:bg-background">
                  <td className="py-2.5 pl-4">
                    <RowCheckbox formId={FORM_ID} id={k.id} label={`${t.bulk.selectRow}: ${contactName(k)}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={contactName(k)} size="md" />
                      <div className="min-w-0">
                        <Link href={`/app/kontakter/${k.id}`} className="row-link font-medium hover:text-brand">
                          {contactName(k)}
                        </Link>
                        {k.title && <p className="text-xs text-muted">{k.title}</p>}
                        {k.companies?.name && <p className="text-xs text-muted md:hidden">{k.companies.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{k.companies?.name}</td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <ProjectChips
                      projects={(k.project_contacts ?? []).map((pc) => projectById.get(pc.project_id))}
                      hrefBase="/app/kontakter"
                    />
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted lg:table-cell">
                    <div>{k.phone}</div>
                    <div className="max-w-56 truncate">{k.email}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted xl:table-cell">
                    {k.last_activity_at ? formatDate(k.last_activity_at, dateLocale) : t.views.never}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <BulkBar
        formId={FORM_ID}
        kind="contacts"
        projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        members={members}
        texts={t.bulk}
      />
    </div>
  );
}
