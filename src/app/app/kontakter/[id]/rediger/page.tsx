import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { updateContact } from "@/app/app/crm-actions";
import { contactName } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CustomFieldInputs } from "@/components/crm/custom-fields";
import { asCustomValues, loadCustomFields } from "@/lib/custom-fields";
import { ContactForm } from "../../contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.contacts.edit };
}

export default async function EditContactPage({ params }: PageProps<"/app/kontakter/[id]/rediger">) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const [{ data: k }, { data: companies }, fields] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name").limit(1000),
    loadCustomFields(supabase, workspace.id, "contact"),
  ]);
  if (!k) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={t.contacts.edit} backHref={`/app/kontakter/${id}`} backLabel={contactName(k)} />
      <Card>
        <ContactForm
          action={updateContact}
          initial={k}
          companies={companies ?? []}
          t={t}
          extra={<CustomFieldInputs fields={fields} values={asCustomValues(k.custom)} t={{ choose: t.crm.choose, title: t.crm.customFields }} />}
        />
      </Card>
    </div>
  );
}
