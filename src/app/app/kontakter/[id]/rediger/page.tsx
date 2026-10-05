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
  const [{ data: k }, fields, { data: projects }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, companies(id, name), project_contacts(project_id)")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    loadCustomFields(supabase, workspace.id, "contact"),
    supabase.from("projects").select("id, name, color, archived").eq("workspace_id", workspace.id).order("name"),
  ]);
  if (!k) notFound();
  const selectedProjects = (k.project_contacts ?? []).map((pc) => pc.project_id);
  // Archived projects are only listed when the contact is already in them (so saving keeps them).
  const projectList = (projects ?? []).filter((p) => !p.archived || selectedProjects.includes(p.id));
  return (
    <div className="space-y-6">
      <PageHeader title={t.contacts.edit} backHref={`/app/kontakter/${id}`} backLabel={contactName(k)} />
      <Card>
        <ContactForm
          action={updateContact}
          initial={k}
          company={k.companies ? { id: k.companies.id, label: k.companies.name } : null}
          t={t}
          projects={projectList}
          selectedProjects={selectedProjects}
          extra={<CustomFieldInputs fields={fields} values={asCustomValues(k.custom)} t={{ choose: t.crm.choose, title: t.crm.customFields }} />}
        />
      </Card>
    </div>
  );
}
