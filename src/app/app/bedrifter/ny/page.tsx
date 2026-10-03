import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { createCompany } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CustomFieldInputs } from "@/components/crm/custom-fields";
import { loadCustomFields } from "@/lib/custom-fields";
import { CompanyForm } from "../company-form";
import { companyFormTexts } from "../texts";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.new };
}

export default async function NewCompanyPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const fields = await loadCustomFields(supabase, workspace.id, "company");
  const empty = { name: "", org_number: "", address: "", postal_code: "", city: "", nace_code: "", nace_description: "", website: "", email: "", phone: "", notes: "" };
  return (
    <div className="space-y-6">
      <PageHeader title={t.companies.new} backHref="/app/bedrifter" backLabel={t.companies.title} />
      <Card>
        <CompanyForm action={createCompany} initial={empty} t={companyFormTexts(t)} brreg={t.brreg}
          showBrreg
          extra={<CustomFieldInputs fields={fields} values={{}} t={{ choose: t.crm.choose, title: t.crm.customFields }} />}
        />
      </Card>
    </div>
  );
}
