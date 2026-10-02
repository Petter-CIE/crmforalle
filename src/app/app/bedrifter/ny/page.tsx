import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { createCompany } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CompanyForm } from "../company-form";
import { companyFormTexts } from "../texts";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.new };
}

export default async function NewCompanyPage() {
  await requireWorkspace();
  const { t } = await getI18n();
  const empty = { name: "", org_number: "", address: "", postal_code: "", city: "", nace_code: "", nace_description: "", website: "", email: "", phone: "", notes: "" };
  return (
    <div className="space-y-6">
      <PageHeader title={t.companies.new} backHref="/app/bedrifter" backLabel={t.companies.title} />
      <Card>
        <CompanyForm action={createCompany} initial={empty} t={companyFormTexts(t)} brreg={t.brreg} showBrreg />
      </Card>
    </div>
  );
}
