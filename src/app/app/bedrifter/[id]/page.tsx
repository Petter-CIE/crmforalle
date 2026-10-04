import type { Metadata } from "next";
import { ProjectDot } from "@/components/crm/project-dot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { DEAL_ROW_SELECT, DealList, type DealRow } from "@/components/crm/deal-list";
import { EconomyCard } from "@/components/crm/economy-card";
import { TaskPanel } from "@/components/crm/task-list";
import { Timeline } from "@/components/crm/timeline";
import { Button, ButtonLink, Card, Select } from "@/components/ui";
import { QuickActions } from "@/components/crm/quick-actions";
import { EmptyState, InfoRow, PageHeader } from "@/components/ui-extra";
import { CustomFieldValues } from "@/components/crm/custom-fields";
import { asCustomValues, loadCustomFields } from "@/lib/custom-fields";
import { addCompanyToProject, removeCompanyFromProject } from "@/app/app/crm-actions";
import { contactName, formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/app/bedrifter/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("companies").select("name").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data?.name ?? "" };
}

export default async function CompanyPage({ params }: PageProps<"/app/bedrifter/[id]">) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const [{ data: c }, { data: contacts }, { data: deals }, { data: allProjects }, fields] = await Promise.all([
    supabase
      .from("companies")
      .select("*, project_companies(project_id, projects(id, name, color))")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase.from("contacts").select("id, first_name, last_name, title, email, phone").eq("company_id", id).order("first_name"),
    supabase.from("deals").select(DEAL_ROW_SELECT).eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    loadCustomFields(supabase, workspace.id, "company"),
  ]);
  if (!c) notFound();
  const inProjects = (c.project_companies ?? []).map((pc) => pc.projects).filter((p) => p !== null);
  const available = (allProjects ?? []).filter((p) => !inProjects.some((ip) => ip.id === p.id));
  const path = `/app/bedrifter/${id}`;
  const website = c.website ? (c.website.startsWith("http") ? c.website : `https://${c.website}`) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        leading={<Avatar name={c.name} size="lg" className="!rounded-2xl" />}
        title={c.name}
        subtitle={[c.org_number && `${t.companies.orgNumber} ${c.org_number}`, c.city].filter(Boolean).join(" · ")}
        backHref="/app/bedrifter"
        backLabel={t.companies.title}
        actions={
          <>
            <ButtonLink href={`/app/salg/ny?bedrift=${id}`}>+ {t.deals.new}</ButtonLink>
            {(c.email || (contacts ?? []).some((k) => k.email)) && (
              <ButtonLink href={`/app/e-post/skriv?bedrift=${id}`} variant="secondary">
                ✉ {t.emails.send}
              </ButtonLink>
            )}
            <ButtonLink href={`${path}/rediger`} variant="secondary">
              {t.crm.edit}
            </ButtonLink>
            <DeleteButton kind="company" id={id} message={t.ui.deleted.company} redirectTo="/app/bedrifter">
              {t.crm.delete}
            </DeleteButton>
          </>
        }
      />
      {c.brreg_status && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          ⚠ {t.watch[c.brreg_status as keyof typeof t.watch.badge]}
        </p>
      )}
      <QuickActions phone={c.phone} email={c.email} address={[c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null} website={c.website} t={{ call: t.mobile.call, sms: t.mobile.sms, email: t.mobile.email, map: t.mobile.map, web: t.mobile.web, note: t.mobile.note }} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <dl>
              <InfoRow label={t.companies.address}>{[c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</InfoRow>
              <InfoRow label={t.companies.phone}>{c.phone && <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>}</InfoRow>
              <InfoRow label={t.companies.email}>{c.email && <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>}</InfoRow>
              <InfoRow label={t.companies.website}>{website && <a href={website} target="_blank" rel="noreferrer" className="hover:underline">{c.website}</a>}</InfoRow>
              <InfoRow label={t.companies.industry}>{c.nace_description}</InfoRow>
              <InfoRow label={t.crm.notes}>{c.notes && <span className="whitespace-pre-wrap">{c.notes}</span>}</InfoRow>
            </dl>
            {c.org_number && (
              <p className="mt-2 text-xs text-muted">
                🏛️ {c.brreg_checked_at ? t.watch.checked(formatDate(c.brreg_checked_at, dateLocale)) : t.watch.watching}
              </p>
            )}
            <div className="mt-3">
              <CustomFieldValues fields={fields} values={asCustomValues(c.custom)} dateLocale={dateLocale} yes={t.crm.yes} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.crm.timeline}</h2>
            <Timeline filter={{ company_id: id }} links={{ company_id: id }} path={path} />
          </Card>
        </div>

        <div className="space-y-6">
          <EconomyCard companyId={id} />

          <Card>
            <h2 className="mb-3 font-semibold">{t.companies.projects}</h2>
            {inProjects.length === 0 ? (
              <p className="mb-3 text-sm text-muted">{t.companies.noProjects}</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {inProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <ProjectDot color={p.color} className="h-2.5 w-2.5" />
                    <Link href={`/app/prosjekter/${p.id}`} className="flex-1 hover:text-brand">
                      {p.name}
                    </Link>
                    <form action={removeCompanyFromProject}>
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="company_id" value={id} />
                      <button type="submit" className="text-xs text-muted hover:text-danger" aria-label={t.projects.remove}>
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {available.length > 0 && (
              <form action={addCompanyToProject} className="flex gap-2">
                <input type="hidden" name="company_id" value={id} />
                <Select name="project_id" required aria-label={t.contacts.addToProject} className="min-w-0 flex-1">
                  <option value="">{t.contacts.addToProject}</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary" className="!px-3">
                  +
                </Button>
              </form>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{t.companies.contacts}</h2>
              <Link href={`/app/kontakter/ny?bedrift=${id}`} className="text-sm text-brand hover:underline">
                + {t.contacts.new}
              </Link>
            </div>
            {!contacts || contacts.length === 0 ? (
              <EmptyState>{t.contacts.empty}</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((k) => (
                  <li key={k.id} className="py-2 text-sm">
                    <Link href={`/app/kontakter/${k.id}`} className="font-medium hover:text-brand">
                      {contactName(k)}
                    </Link>
                    <p className="text-xs text-muted">{[k.title, k.phone, k.email].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.companies.deals}</h2>
            <DealList deals={(deals ?? []) as DealRow[]} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.tasks.title}</h2>
            <TaskPanel links={{ company_id: id }} path={path} />
          </Card>
        </div>
      </div>
    </div>
  );
}
