import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { updateCompany } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CustomFieldInputs } from "@/components/crm/custom-fields";
import { asCustomValues, loadCustomFields } from "@/lib/custom-fields";
import { CompanyForm } from "../../company-form";
import { companyFormTexts } from "../../texts";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.edit };
}

export default async function EditCompanyPage({ params }: PageProps<"/app/bedrifter/[id]/rediger">) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const [{ data: c }, fields] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    loadCustomFields(supabase, workspace.id, "company"),
  ]);
  if (!c) notFound();
  const v = (x: string | null) => x ?? "";
  return (
    <div className="space-y-6">
      <PageHeader title={t.companies.edit} backHref={`/app/bedrifter/${id}`} backLabel={c.name} />
      <Card>
        <CompanyForm
          dup={{ label: t.dupes.warnCompany, open: t.dupes.open }}
          action={updateCompany}
          initial={{
            id: c.id,
            name: c.name,
            org_number: v(c.org_number),
            address: v(c.address),
            postal_code: v(c.postal_code),
            city: v(c.city),
            nace_code: v(c.nace_code),
            nace_description: v(c.nace_description),
            website: v(c.website),
            email: v(c.email),
            phone: v(c.phone),
            notes: v(c.notes),
          }}
          t={companyFormTexts(t)}
          brreg={t.brreg}
          showBrreg={false}
          extra={<CustomFieldInputs fields={fields} values={asCustomValues(c.custom)} t={{ choose: t.crm.choose, title: t.crm.customFields }} />}
        />
      </Card>
    </div>
  );
}
