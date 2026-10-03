import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { createDeal } from "@/app/app/crm-actions";
import { contactName } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CustomFieldInputs } from "@/components/crm/custom-fields";
import { loadCustomFields } from "@/lib/custom-fields";
import { DealFields } from "../deal-fields";
import { loadDealOptions } from "../options";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.deals.new };
}

export default async function NewDealPage({ searchParams }: PageProps<"/app/salg/ny">) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const ctx = await requireWorkspace();
  const { t } = await getI18n();
  const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
  const companyId = uuid(str(sp.bedrift));
  const contactId = uuid(str(sp.kontakt));
  const projectId = uuid(str(sp.prosjekt));
  const ws = ctx.workspace.id;
  const [options, fields, { data: contact }, { data: company }] = await Promise.all([
    loadDealOptions(ctx),
    loadCustomFields(ctx.supabase, ws, "deal"),
    contactId
      ? ctx.supabase.from("contacts").select("id, first_name, last_name, companies(id, name)").eq("id", contactId).eq("workspace_id", ws).maybeSingle()
      : Promise.resolve({ data: null }),
    companyId ? ctx.supabase.from("companies").select("id, name").eq("id", companyId).eq("workspace_id", ws).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  // A deal started from a contact also gets the contact's company.
  const linkedCompany = company ?? contact?.companies ?? null;
  const back = contactId
    ? `/app/kontakter/${contactId}`
    : companyId
      ? `/app/bedrifter/${companyId}`
      : projectId
        ? `/app/prosjekter/${projectId}`
        : "/app/salg";

  return (
    <div className="space-y-6">
      <PageHeader title={t.deals.new} backHref={back} backLabel={t.crm.back} />
      <Card>
        <ActionForm action={createDeal} submitLabel={t.deals.new} pendingLabel={t.crm.saving}>
          <DealFields
            t={t}
            options={options}
            initial={{
              stage_id: options.stages[0]?.id,
              company: linkedCompany ? { id: linkedCompany.id, label: linkedCompany.name } : null,
              contact: contact ? { id: contact.id, label: contactName(contact) } : null,
              project_id: projectId,
              owner_id: ctx.user.id,
            }}
          />
          <CustomFieldInputs fields={fields} values={{}} t={{ choose: t.crm.choose, title: t.crm.customFields }} />
        </ActionForm>
      </Card>
    </div>
  );
}
