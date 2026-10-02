import type { Metadata } from "next";
import Link from "next/link";
import { BulkBar, RowCheckbox, SelectAll } from "@/components/crm/bulk-bar";
import { ProjectChips } from "@/components/crm/project-chips";
import { ButtonLink, Card, Input, Select } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.title };
}

const FORM_ID = "bulk-companies";

export default async function CompaniesPage({ searchParams }: PageProps<"/app/bedrifter">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const projectId = typeof sp.prosjekt === "string" ? sp.prosjekt : "";
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();

  const join = projectId ? "project_companies!inner(project_id)" : "project_companies(project_id)";
  let req = supabase
    .from("companies")
    .select(`id, name, org_number, city, contacts(count), deals(count), ${join}`)
    .eq("workspace_id", workspace.id)
    .order("name")
    .limit(1000);
  if (projectId) req = req.eq("project_companies.project_id", projectId);
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    req = req.or(`name.ilike.%${safe}%,org_number.ilike.%${safe.replace(/\s/g, "")}%,city.ilike.%${safe}%`);
  }
  const [{ data: companies }, { data: projects }, members] = await Promise.all([
    req,
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .order("name"),
    listMembers(ctx),
  ]);
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.companies.title}
        actions={
          <>
            <ButtonLink href="/app/import" variant="secondary">
              {t.import.button}
            </ButtonLink>
            <ButtonLink href="/app/bedrifter/ny">+ {t.companies.new}</ButtonLink>
          </>
        }
      />
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={query} placeholder={t.companies.searchPlaceholder} aria-label={t.crm.search} />
        <Select name="prosjekt" defaultValue={projectId} aria-label={t.companies.projects}>
          <option value="">{t.contacts.allProjects}</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:bg-background"
        >
          {t.contacts.filter}
        </button>
      </form>
      {!companies || companies.length === 0 ? (
        <EmptyState>{query || projectId ? t.crm.noResults : t.companies.empty}</EmptyState>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c) => (
                <tr key={c.id} className="relative hover:bg-background">
                  <td className="py-2.5 pl-4">
                    <RowCheckbox formId={FORM_ID} id={c.id} label={`${t.bulk.selectRow}: ${c.name}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/app/bedrifter/${c.id}`} className="row-link font-medium hover:text-brand">
                      {c.name}
                    </Link>
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
