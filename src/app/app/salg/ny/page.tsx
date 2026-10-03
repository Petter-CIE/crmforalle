import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { createDeal } from "@/app/app/crm-actions";
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
  const [options, fields] = await Promise.all([loadDealOptions(ctx), loadCustomFields(ctx.supabase, ctx.workspace.id, "deal")]);
  const companyId = str(sp.bedrift);
  const contactId = str(sp.kontakt);
  const projectId = str(sp.prosjekt);
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
              company_id: companyId,
              contact_id: contactId,
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
