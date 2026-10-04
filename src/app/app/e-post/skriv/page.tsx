import type { Metadata } from "next";
import { Card, ButtonLink } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { contactName } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { Compose, type Recipient } from "./compose";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.emails.title };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (v: string | string[] | undefined) => (typeof v === "string" && UUID.test(v) ? v : null);

/** Write an e-mail to a contact (from a contact, company or deal page). */
export default async function ComposePage({ searchParams }: PageProps<"/app/e-post/skriv">) {
  const sp = await searchParams;
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const e = t.emails;
  const contactId = one(sp.kontakt);
  const dealId = one(sp.salg);
  let companyId = one(sp.bedrift);

  let dealTitle = "";
  let dealContact: string | null = null;
  if (dealId) {
    const { data } = await supabase.from("deals").select("title, contact_id, company_id").eq("id", dealId).eq("workspace_id", workspace.id).maybeSingle();
    dealTitle = data?.title ?? "";
    dealContact = data?.contact_id ?? null;
    companyId = companyId ?? data?.company_id ?? null;
  }
  const primary = contactId ?? dealContact;
  if (!companyId && primary) {
    const { data } = await supabase.from("contacts").select("company_id").eq("id", primary).maybeSingle();
    companyId = data?.company_id ?? null;
  }

  const [{ data: contacts }, { data: company }, { data: templates }, { data: me }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, companies(name)")
      .eq("workspace_id", workspace.id)
      .not("email", "is", null)
      .or([primary && `id.eq.${primary}`, companyId && `company_id.eq.${companyId}`].filter(Boolean).join(",") || "id.is.null")
      .limit(100),
    companyId ? supabase.from("companies").select("id, name, email").eq("id", companyId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("email_templates").select("id, name, subject, body").eq("workspace_id", workspace.id).order("name"),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
  ]);

  const recipients: Recipient[] = [
    ...(contacts ?? [])
      .sort((a, b) => (a.id === primary ? -1 : b.id === primary ? 1 : 0))
      .map((c) => ({
        value: `contact:${c.id}`,
        label: `${contactName(c)} <${c.email}>`,
        first: c.first_name,
        last: c.last_name ?? "",
        company: c.companies?.name ?? company?.name ?? "",
      })),
    ...(company?.email ? [{ value: `company:${company.id}`, label: `${company.name} <${company.email}>`, first: "", last: "", company: company.name }] : []),
  ];
  const back = dealId ? `/app/salg/${dealId}` : primary ? `/app/kontakter/${primary}` : companyId ? `/app/bedrifter/${companyId}` : "/app";
  const myName = me?.full_name || me?.email || "";
  const myEmail = me?.email ?? user.email ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={e.title}
        backHref={back}
        backLabel={t.crm.back}
        actions={
          <ButtonLink href="/app/innstillinger/e-postmaler" variant="secondary">
            {e.manageTemplates}
          </ButtonLink>
        }
      />
      <Card>
        {recipients.length === 0 ? (
          <EmptyState>{e.noEmail}</EmptyState>
        ) : (
          <Compose
            recipients={recipients}
            templates={templates ?? []}
            me={{ name: myName, email: myEmail, phone: "", company: workspace.name }}
            deal={dealTitle}
            dealId={dealId}
            back={back}
            t={{
              to: e.to,
              template: e.template,
              noTemplate: e.noTemplate,
              subject: e.subject,
              body: e.body,
              bccMe: e.bccMe,
              sendBtn: e.sendBtn,
              sending: e.sending,
              variablesHelp: e.variablesHelp,
              fromInfo: e.fromInfo(`${myName} (${workspace.name})`, myEmail),
            }}
          />
        )}
      </Card>
    </div>
  );
}
