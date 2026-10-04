import type { Metadata } from "next";
import { ProjectDot } from "@/components/crm/project-dot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { DEAL_ROW_SELECT, DealList, type DealRow } from "@/components/crm/deal-list";
import { TaskPanel } from "@/components/crm/task-list";
import { Timeline } from "@/components/crm/timeline";
import { Button, ButtonLink, Card, Select } from "@/components/ui";
import { QuickActions } from "@/components/crm/quick-actions";
import { InfoRow, PageHeader } from "@/components/ui-extra";
import { CustomFieldValues } from "@/components/crm/custom-fields";
import { asCustomValues, loadCustomFields } from "@/lib/custom-fields";
import { addContactToProject, removeContactFromProject } from "@/app/app/crm-actions";
import { contactName, formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/app/kontakter/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("contacts").select("first_name, last_name").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data ? contactName(data) : "" };
}

export default async function ContactPage({ params }: PageProps<"/app/kontakter/[id]">) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const [{ data: k }, { data: deals }, { data: allProjects }, fields] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, companies(id, name), project_contacts(project_id, projects(id, name, color))")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase.from("deals").select(DEAL_ROW_SELECT).eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    loadCustomFields(supabase, workspace.id, "contact"),
  ]);
  if (!k) notFound();
  const path = `/app/kontakter/${id}`;
  const inProjects = (k.project_contacts ?? []).map((pc) => pc.projects).filter((p) => p !== null);
  const available = (allProjects ?? []).filter((p) => !inProjects.some((ip) => ip.id === p.id));

  return (
    <div className="space-y-6">
      <PageHeader
        leading={<Avatar name={contactName(k)} size="lg" />}
        title={contactName(k)}
        subtitle={
          <>
            {k.title}
            {k.title && k.companies && " · "}
            {k.companies && (
              <Link href={`/app/bedrifter/${k.companies.id}`} className="hover:underline">
                {k.companies.name}
              </Link>
            )}
          </>
        }
        backHref="/app/kontakter"
        backLabel={t.contacts.title}
        actions={
          <>
            <ButtonLink href={`/app/salg/ny?kontakt=${id}${k.company_id ? `&bedrift=${k.company_id}` : ""}`}>
              + {t.deals.new}
            </ButtonLink>
            {k.email && (
              <ButtonLink href={`/app/e-post/skriv?kontakt=${id}`} variant="secondary">
                ✉ {t.emails.send}
              </ButtonLink>
            )}
            <ButtonLink href={`${path}/rediger`} variant="secondary">
              {t.crm.edit}
            </ButtonLink>
            <DeleteButton kind="contact" id={id} message={t.ui.deleted.contact} redirectTo="/app/kontakter">
              {t.crm.delete}
            </DeleteButton>
          </>
        }
      />
      <QuickActions phone={k.phone} email={k.email} address={[k.address, [k.postal_code, k.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null} website={null} t={{ call: t.mobile.call, sms: t.mobile.sms, email: t.mobile.email, map: t.mobile.map, web: t.mobile.web, note: t.mobile.note }} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <dl>
              <InfoRow label={t.contacts.phone}>{k.phone && <a href={`tel:${k.phone}`} className="hover:underline">{k.phone}</a>}</InfoRow>
              <InfoRow label={t.contacts.email}>{k.email && <a href={`mailto:${k.email}`} className="hover:underline">{k.email}</a>}</InfoRow>
              {(k.address || k.postal_code || k.city) && (
                <InfoRow label={t.contacts.address}>
                  <span>
                    {k.address}
                    {k.address && (k.postal_code || k.city) && <br />}
                    {[k.postal_code, k.city].filter(Boolean).join(" ")}
                  </span>
                </InfoRow>
              )}
              <InfoRow label={t.contacts.consent}>
                {k.marketing_consent && k.marketing_consent_at ? (
                  <span className="text-brand">✓ {t.contacts.consentGiven(formatDateTime(k.marketing_consent_at, dateLocale))}</span>
                ) : (
                  <span className="text-muted">{t.contacts.noConsent}</span>
                )}
              </InfoRow>
              <InfoRow label={t.crm.notes}>{k.notes && <span className="whitespace-pre-wrap">{k.notes}</span>}</InfoRow>
            </dl>
            <div className="mt-3">
              <CustomFieldValues fields={fields} values={asCustomValues(k.custom)} dateLocale={dateLocale} yes={t.crm.yes} />
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              <a href={`${path}/gdpr`} download className="text-brand hover:underline">
                ⬇ {t.gdpr.export}
              </a>{" "}
              · {t.gdpr.exportHint}
            </p>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t.crm.timeline}</h2>
            <Timeline filter={{ contact_id: id }} links={{ contact_id: id, company_id: k.company_id }} path={path} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">{t.contacts.projects}</h2>
            {inProjects.length === 0 ? (
              <p className="mb-3 text-sm text-muted">{t.contacts.noProjects}</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {inProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <ProjectDot color={p.color} className="h-2.5 w-2.5" />
                    <Link href={`/app/prosjekter/${p.id}`} className="flex-1 hover:text-brand">
                      {p.name}
                    </Link>
                    <form action={removeContactFromProject}>
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="contact_id" value={id} />
                      <button type="submit" className="text-xs text-muted hover:text-danger" aria-label={t.projects.remove}>
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {available.length > 0 && (
              <form action={addContactToProject} className="flex gap-2">
                <input type="hidden" name="contact_id" value={id} />
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
            <h2 className="mb-3 font-semibold">{t.deals.title}</h2>
            <DealList deals={(deals ?? []) as DealRow[]} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.tasks.title}</h2>
            <TaskPanel links={{ contact_id: id, company_id: k.company_id }} path={path} />
          </Card>
        </div>
      </div>
    </div>
  );
}
