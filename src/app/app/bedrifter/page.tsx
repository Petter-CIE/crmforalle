import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BulkBar, RowCheckbox, SelectAll } from "@/components/crm/bulk-bar";
import { ListFilterForm } from "@/components/crm/list-filter-form";
import { ProjectChips } from "@/components/crm/project-chips";
import { SavedViews } from "@/components/crm/saved-views";
import { ButtonLink, Card } from "@/components/ui";
import { EmptyHero, PageHeader } from "@/components/ui-extra";
import { formatDate, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { filterQuery, inactiveSince, parseFilters, safeLike } from "@/lib/list-filters";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.title };
}

const FORM_ID = "bulk-companies";

export default async function CompaniesPage({ searchParams }: PageProps<"/app/bedrifter">) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const query = f.q;
  const projectId = f.project;
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t, dateLocale } = await getI18n();

  const join = projectId ? "project_companies!inner(project_id)" : "project_companies(project_id)";
  let req = supabase
    .from("companies")
    .select(`id, name, org_number, city, brreg_status, last_activity_at, contacts(count), deals(count), ${join}`)
    .eq("workspace_id", workspace.id)
    .order("name")
    .limit(1000);
  if (projectId) req = req.eq("project_companies.project_id", projectId);
  if (f.owner) req = f.owner === "ingen" ? req.is("owner_id", null) : req.eq("owner_id", f.owner);
  if (f.city) req = req.ilike("city", `%${safeLike(f.city)}%`);
  if (f.inactive) req = req.or(`last_activity_at.is.null,last_activity_at.lt.${inactiveSince(f.inactive)}`);
  if (query) {
    // Name or org. number only (the city has its own filter). Every word must be in the name, so
    // "bergen lastebil" finds "Bergen Lastebilkontor AS" but not every company located in Bergen.
    const digits = query.replace(/\s/g, "");
    if (/^\d{3,9}$/.test(digits)) req = req.like("org_number", `${digits}%`);
    else for (const word of safeLike(query).split(/\s+/).filter(Boolean)) req = req.ilike("name", `%${word}%`);
  }
  const [{ data: companies }, { data: projects }, members, { data: views }] = await Promise.all([
    req,
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .order("name"),
    listMembers(ctx),
    supabase.from("saved_views").select("id, name, query, shared, user_id").eq("workspace_id", workspace.id).eq("entity", "companies").order("name"),
  ]);
  const current = filterQuery(f);
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.companies.title}
        actions={
          <>
            <ButtonLink href="/app/duplikater" variant="ghost">
              {t.dupes.title}
            </ButtonLink>
            <ButtonLink href="/app/import" variant="secondary">
              {t.import.button}
            </ButtonLink>
            <ButtonLink href="/app/bedrifter/ny">+ {t.companies.new}</ButtonLink>
          </>
        }
      />
      <ListFilterForm
        f={f}
        base="/app/bedrifter"
        projects={projects ?? []}
        members={members}
        consent={false}
        t={{
          search: t.crm.search,
          searchPlaceholder: t.companies.searchPlaceholder,
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
        }}
      />
      <SavedViews
        entity="companies"
        base="/app/bedrifter"
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
      {!companies || companies.length === 0 ? (
        current ? (
          <EmptyHero icon="search" title={t.ui.empty.noResults} text={t.ui.empty.noResultsText} />
        ) : (
          <EmptyHero
            icon="companies"
            title={t.ui.empty.companiesTitle}
            text={t.ui.empty.companiesText}
            actions={
              <>
                <ButtonLink href="/app/bedrifter/ny">+ {t.ui.empty.companiesAction}</ButtonLink>
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
                <th className="hidden px-3 py-2 font-medium lg:table-cell">{t.companies.orgNumber}</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">{t.companies.city}</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">{t.companies.projects}</th>
                <th className="px-3 py-2 text-right font-medium">{t.companies.contacts}</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">{t.companies.deals}</th>
                <th className="hidden px-4 py-2 font-medium xl:table-cell">{t.views.lastActivity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c) => (
                <tr key={c.id} data-del={c.id} className="relative hover:bg-background">
                  <td className="py-2.5 pl-4">
                    <RowCheckbox formId={FORM_ID} id={c.id} label={`${t.bulk.selectRow}: ${c.name}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={c.name} size="md" className="!rounded-lg" />
                      <Link href={`/app/bedrifter/${c.id}`} className="row-link font-medium hover:text-brand">
                        {c.name}
                      </Link>
                      {c.brreg_status && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          {t.watch.badge[c.brreg_status as keyof typeof t.watch.badge]}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 tabular-nums text-muted lg:table-cell">{c.org_number}</td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{c.city}</td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <ProjectChips
                      projects={(c.project_companies ?? []).map((pc) => projectById.get(pc.project_id))}
                      hrefBase="/app/bedrifter"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.contacts?.[0]?.count ?? 0}</td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums sm:table-cell">
                    {c.deals?.[0]?.count ?? 0}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted xl:table-cell">
                    {c.last_activity_at ? formatDate(c.last_activity_at, dateLocale) : t.views.never}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <BulkBar
        formId={FORM_ID}
        kind="companies"
        projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        members={members}
        texts={t.bulk}
      />
    </div>
  );
}
