import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { ButtonLink, Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";
import { deleteLeadForm, updateLeadForm } from "../../customize-actions";
import { LeadFormFields } from "../fields";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.leads.title };
}

function Code({ value, t }: { value: string; t: { copy: string; copied: string } }) {
  return (
    <div className="space-y-2">
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-relaxed">
        <code>{value}</code>
      </pre>
      <CopyButton value={value} label={t.copy} copied={t.copied} />
    </div>
  );
}

export default async function LeadFormPage({ params }: PageProps<"/app/innstillinger/skjema/[id]">) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  if (!canManage(workspace.role)) notFound();
  const { t } = await getI18n();
  const l = t.leads;
  const [{ data: f }, members, { data: projects }] = await Promise.all([
    supabase.from("lead_forms").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    listMembers(ctx),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
  ]);
  if (!f) notFound();

  const base = siteUrl();
  const formUrl = `${base}/skjema/${f.public_key}`;
  const frameId = `allseats-${f.public_key.slice(0, 8)}`;
  const iframe = `<iframe id="${frameId}" src="${formUrl}?embed=1" title="${(f.title || l.defaultTitle).replace(/"/g, "&quot;")}" style="width:100%;max-width:640px;border:0;min-height:480px" loading="lazy"></iframe>
<script>
  addEventListener("message", function (e) {
    if (e.origin === "${base}" && e.data && e.data.allseatsForm === "${f.public_key}") {
      document.getElementById("${frameId}").style.height = e.data.height + "px";
    }
  });
</script>`;
  const html = `<form action="${base}/api/lead/${f.public_key}" method="post">
  <input name="name" required placeholder="${l.name}">
  <input name="email" type="email" placeholder="${l.email}">
  <input name="phone" type="tel" placeholder="${l.phone}">
  <input name="company" placeholder="${l.company}">
  <textarea name="message" placeholder="${l.message}"></textarea>
  <!-- spam trap: keep hidden and empty -->
  <input name="website_url" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">${l.send}</button>
</form>`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`🌐 ${f.name}`}
        subtitle={l.stats(f.submissions, null)}
        backHref="/app/innstillinger/skjema"
        backLabel={l.back}
        actions={
          <ButtonLink href={`/skjema/${f.public_key}`} target="_blank" variant="secondary">
            {l.open} ↗
          </ButtonLink>
        }
      />
      <Card>
        <ActionForm action={updateLeadForm} submitLabel={l.save} pendingLabel={t.crm.saving}>
          <input type="hidden" name="id" value={f.id} />
          <LeadFormFields v={f} members={members} projects={projects ?? []} t={l} />
        </ActionForm>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{l.embedTitle}</h2>
        <div className="space-y-6 text-sm">
          <div className="space-y-2">
            <p>1. {l.embedIframe}</p>
            <Code value={iframe} t={l} />
          </div>
          <div className="space-y-2">
            <p>2. {l.embedHtml}</p>
            <Code value={html} t={l} />
          </div>
          <div className="space-y-2">
            <p>3. {l.embedLink}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg border border-border bg-background px-3 py-2 text-xs">{formUrl}</code>
              <CopyButton value={formUrl} label={l.copy} copied={l.copied} />
            </div>
          </div>
        </div>
      </Card>
      <form action={deleteLeadForm}>
        <input type="hidden" name="id" value={f.id} />
        <ConfirmButton variant="danger" message={l.removeConfirm}>
          {l.remove}
        </ConfirmButton>
      </form>
    </div>
  );
}
