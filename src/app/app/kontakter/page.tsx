import type { Metadata } from "next";
import Link from "next/link";
import { BulkBar, RowCheckbox, SelectAll } from "@/components/crm/bulk-bar";
import { ProjectChips } from "@/components/crm/project-chips";
import { ButtonLink, Card, Input, Select } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { contactName, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.contacts.title };
}

const FORM_ID = "bulk-contacts";

export default async function ContactsPage({ searchParams }: PageProps<"/app/kontakter">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const projectId = typeof sp.prosjekt === "string" ? sp.prosjekt : "";
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();

  const join = projectId ? "project_contacts!inner(project_id)" : "project_contacts(project_id)";
  let req = supabase
    .from("contacts")
    .select(`id, first_name, last_name, email, phone, title, companies(id, name), ${join}`)
    .eq("workspace_id", workspace.id)
    .order("first_name")
    .limit(1000);
  if (projectId) req = req.eq("project_contacts.project_id", projectId);
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    req = req.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const [{ data: contacts }, { data: projects }, members] = await Promise.all([
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
        title={t.contacts.title}
        actions={
          <>
            <ButtonLink href="/app/import" variant="secondary">
              {t.import.button}
            </ButtonLink>
            <ButtonLink href={projectId ? `/app/kontakter/ny?prosjekt=${projectId}` : "/app/kontakter/ny"}>
              + {t.contacts.new}
            </ButtonLink>
          </>
        }
      />
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={query} placeholder={t.contacts.searchPlaceholder} aria-label={t.crm.search} />
        <Select name="prosjekt" defaultValue={projectId} aria-label={t.contacts.projects}>
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
      {!contacts || contacts.length === 0 ? (
        <EmptyState>{query || projectId ? t.crm.noResults : t.contacts.empty}</EmptyState>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((k) => (
                <tr key={k.id} className="relative hover:bg-background">
                  <td className="py-2.5 pl-4">
                    <RowCheckbox formId={FORM_ID} id={k.id} label={`${t.bulk.selectRow}: ${contactName(k)}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/app/kontakter/${k.id}`} className="row-link font-medium hover:text-brand">
                      {contactName(k)}
                    </Link>
                    {k.title && <p className="text-xs text-muted">{k.title}</p>}
                    {k.companies?.name && <p className="text-xs text-muted md:hidden">{k.companies.name}</p>}
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
