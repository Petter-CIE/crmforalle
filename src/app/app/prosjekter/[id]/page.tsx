import type { Metadata } from "next";
import { ProjectDot } from "@/components/crm/project-dot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { DEAL_ROW_SELECT, DealList, type DealRow } from "@/components/crm/deal-list";
import { TaskPanel } from "@/components/crm/task-list";
import { Button, ButtonLink, Card } from "@/components/ui";
import { PickAndSubmit } from "@/components/pick-and-submit";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import {
  addCompanyToProject,
  addContactToProject,
  deleteProject,
  removeCompanyFromProject,
  removeContactFromProject,
  setProjectArchived,
  updateProject,
} from "@/app/app/crm-actions";
import { contactName, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { ProjectFields } from "../project-fields";

export async function generateMetadata({ params }: PageProps<"/app/prosjekter/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("projects").select("name").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data?.name ?? "" };
}

export default async function ProjectPage({ params }: PageProps<"/app/prosjekter/[id]">) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  const [{ data: p }, { data: members }, { data: deals }, team, { data: linked }] =
    await Promise.all([
    supabase.from("projects").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    supabase
      .from("project_contacts")
      .select("contact_id, contacts(id, first_name, last_name, title, email, phone, companies(name))")
      .eq("project_id", id),
    supabase.from("deals").select(DEAL_ROW_SELECT).eq("project_id", id).order("created_at", { ascending: false }),
    listMembers(ctx),
    supabase.from("project_companies").select("company_id, companies(id, name, city, org_number)").eq("project_id", id),
  ]);
  if (!p) notFound();
  const companies = (linked ?? [])
    .map((l) => l.companies)
    .filter((c) => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
  const ownerName = p.owner_id ? team.find((m) => m.id === p.owner_id)?.name : null;
  const path = `/app/prosjekter/${id}`;
  const contacts = (members ?? [])
    .map((m) => m.contacts)
    .filter((c) => c !== null)
    .sort((a, b) => contactName(a).localeCompare(contactName(b)));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ProjectDot color={p.color} className="h-3.5 w-3.5" />
            {p.name}
            {p.archived && <span className="text-sm font-normal text-muted">({t.projects.archived})</span>}
          </span>
        }
        subtitle={
          <>
            {team.length > 1 && (
              <span className="block">
                {t.projects.owner}: <span className="font-medium text-foreground">{ownerName ?? t.projects.noOwner}</span>
              </span>
            )}
            {p.description}
          </>
        }
        backHref="/app/prosjekter"
        backLabel={t.projects.title}
        actions={
          <>
            <ButtonLink href={`/app/salg/ny?prosjekt=${id}`}>+ {t.deals.new}</ButtonLink>
            <form action={setProjectArchived}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="archived" value={p.archived ? "false" : "true"} />
              <Button type="submit" variant="secondary">
                {p.archived ? t.projects.unarchive : t.projects.archive}
              </Button>
            </form>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={id} />
              <ConfirmButton message={t.crm.confirmDelete} variant="danger">
                {t.crm.delete}
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {t.projects.contacts} ({contacts.length})
              </h2>
              <Link href={`/app/kontakter/ny?prosjekt=${id}`} className="text-sm text-brand hover:underline">
                + {t.contacts.new}
              </Link>
            </div>
            {contacts.length === 0 ? (
              <EmptyState>{t.projects.noContacts}</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li key={c.id} className="relative -mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-background">
                    <div className="min-w-0 flex-1">
                      <Link href={`/app/kontakter/${c.id}`} className="row-link font-medium hover:text-brand">
                        {contactName(c)}
                      </Link>
                      <p className="text-xs text-muted">{[c.title, c.companies?.name, c.phone, c.email].filter(Boolean).join(" · ")}</p>
                    </div>
                    <form action={removeContactFromProject} className="row-above">
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="contact_id" value={c.id} />
                      <button type="submit" className="text-xs text-muted hover:text-danger">
                        {t.projects.remove}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <PickAndSubmit
              action={addContactToProject}
              hidden={{ project_id: id }}
              field="contact_id"
              kind="contact"
              exclude={contacts.map((c) => c.id)}
              placeholder={`+ ${t.projects.addContact} – ${t.crm.searchContact.toLowerCase()}`}
              emptyText={t.crm.noResults}
            />
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {t.projects.companies} ({companies.length})
              </h2>
              <Link href={`/app/bedrifter?prosjekt=${id}`} className="text-sm text-brand hover:underline">
                {t.companies.title} →
              </Link>
            </div>
            {companies.length === 0 ? (
              <EmptyState>{t.projects.noCompanies}</EmptyState>
            ) : (
              <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                {companies.map((c) => (
                  <li key={c.id} className="relative -mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-background">
                    <div className="min-w-0 flex-1">
                      <Link href={`/app/bedrifter/${c.id}`} className="row-link font-medium hover:text-brand">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted">{[c.org_number, c.city].filter(Boolean).join(" · ")}</p>
                    </div>
                    <form action={removeCompanyFromProject} className="row-above">
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="company_id" value={c.id} />
                      <button type="submit" className="text-xs text-muted hover:text-danger">
                        {t.projects.remove}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <PickAndSubmit
              action={addCompanyToProject}
              hidden={{ project_id: id }}
              field="company_id"
              kind="company"
              exclude={companies.map((c) => c.id)}
              placeholder={`+ ${t.projects.addCompany} – ${t.crm.searchCompany.toLowerCase()}`}
              emptyText={t.crm.noResults}
            />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.projects.tasks}</h2>
            <TaskPanel links={{ project_id: id }} path={path} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.projects.deals}</h2>
            <DealList deals={(deals ?? []) as DealRow[]} />
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">{t.projects.edit}</h2>
          <ActionForm action={updateProject} submitLabel={t.crm.save} pendingLabel={t.crm.saving} successText={t.settings.saved}>
            <input type="hidden" name="id" value={id} />
            <ProjectFields t={t} initial={p} members={team} me={user.id} />
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
