import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { DEAL_ROW_SELECT, DealList, type DealRow } from "@/components/crm/deal-list";
import { TaskPanel } from "@/components/crm/task-list";
import { Timeline } from "@/components/crm/timeline";
import { ButtonLink, Card } from "@/components/ui";
import { EmptyState, InfoRow, PageHeader } from "@/components/ui-extra";
import { deleteCompany } from "@/app/app/crm-actions";
import { contactName } from "@/lib/crm";
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
  const { t } = await getI18n();
  const [{ data: c }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("contacts").select("id, first_name, last_name, title, email, phone").eq("company_id", id).order("first_name"),
    supabase.from("deals").select(DEAL_ROW_SELECT).eq("company_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const path = `/app/bedrifter/${id}`;
  const website = c.website ? (c.website.startsWith("http") ? c.website : `https://${c.website}`) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.name}
        subtitle={[c.org_number && `${t.companies.orgNumber} ${c.org_number}`, c.city].filter(Boolean).join(" · ")}
        backHref="/app/bedrifter"
        backLabel={t.companies.title}
        actions={
          <>
            <ButtonLink href={`/app/salg/ny?bedrift=${id}`}>+ {t.deals.new}</ButtonLink>
            <ButtonLink href={`${path}/rediger`} variant="secondary">
              {t.crm.edit}
            </ButtonLink>
            <form action={deleteCompany}>
              <input type="hidden" name="id" value={id} />
              <ConfirmButton message={t.crm.confirmDelete} variant="danger">
                {t.crm.delete}
              </ConfirmButton>
            </form>
          </>
        }
      />

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
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.crm.timeline}</h2>
            <Timeline filter={{ company_id: id }} links={{ company_id: id }} path={path} />
          </Card>
        </div>

        <div className="space-y-6">
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
