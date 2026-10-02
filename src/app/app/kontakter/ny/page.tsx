import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { createContact } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { ContactForm } from "../contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.contacts.new };
}

export default async function NewContactPage({ searchParams }: PageProps<"/app/kontakter/ny">) {
  const sp = await searchParams;
  const companyId = typeof sp.bedrift === "string" ? sp.bedrift : null;
  const projectId = typeof sp.prosjekt === "string" ? sp.prosjekt : null;
  // prefilled from an e-mail that didn't match anyone (/app/e-post)
  const email = typeof sp.epost === "string" ? sp.epost.slice(0, 200) : null;
  const name = typeof sp.navn === "string" ? sp.navn.trim().slice(0, 200) : "";
  const parts = name.split(/\s+/).filter(Boolean);
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const { data: companies } = await supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name").limit(1000);
  const hidden: Record<string, string> = {};
  if (projectId) hidden.project_id = projectId;
  if (email) hidden.tilbake = "/app/e-post";
  if (companyId) hidden.tilbake = `/app/bedrifter/${companyId}`;
  else if (projectId) hidden.tilbake = `/app/prosjekter/${projectId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.contacts.new}
        backHref={companyId ? `/app/bedrifter/${companyId}` : "/app/kontakter"}
        backLabel={t.crm.back}
      />
      <Card>
        <ContactForm
          action={createContact}
          initial={{
            first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? ""),
            last_name: parts.length > 1 ? parts[parts.length - 1] : null,
            email, phone: null, title: null, company_id: companyId, notes: null }}
          companies={companies ?? []}
          t={t}
          hidden={hidden}
        />
      </Card>
    </div>
  );
}
