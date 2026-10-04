import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, Input } from "@/components/ui";
import { EmptyState, Field, PageHeader, Textarea } from "@/components/ui-extra";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { deleteTemplate, saveTemplate } from "@/app/app/e-post/email-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.emails.templates };
}

function TemplateFields({ prefix, v, t }: { prefix: string; v?: { name: string; subject: string; body: string }; t: Dictionary["emails"] }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.templateName} htmlFor={`${prefix}_name`}>
          <Input id={`${prefix}_name`} name="name" required maxLength={80} defaultValue={v?.name} placeholder={t.templateNamePlaceholder} />
        </Field>
        <Field label={t.subject} htmlFor={`${prefix}_subject`}>
          <Input id={`${prefix}_subject`} name="subject" required maxLength={200} defaultValue={v?.subject} placeholder={t.exampleSubject} />
        </Field>
      </div>
      <Field label={t.body} htmlFor={`${prefix}_body`}>
        <Textarea id={`${prefix}_body`} name="body" required rows={8} maxLength={20000} defaultValue={v?.body} placeholder={t.exampleBody} />
      </Field>
      <p className="text-xs text-muted">{t.variablesHelp}</p>
    </div>
  );
}

export default async function TemplatesPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const e = t.emails;
  const { data: templates } = await supabase.from("email_templates").select("id, name, subject, body").eq("workspace_id", workspace.id).order("name");

  return (
    <div className="space-y-6">
      <PageHeader title={e.templates} subtitle={e.templatesIntro} backHref="/app/innstillinger" backLabel={t.settings.title} />
      <Card>
        {(templates ?? []).length === 0 ? (
          <EmptyState>{e.noTemplates}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {(templates ?? []).map((tpl) => (
              <li key={tpl.id} className="py-2">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">✉ {tpl.name}</span>
                      <span className="block truncate text-xs text-muted">{tpl.subject}</span>
                    </span>
                    <span className="text-xs text-brand">{t.crm.edit}</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={saveTemplate} submitLabel={e.saveTemplate} pendingLabel={t.crm.saving}>
                      <input type="hidden" name="id" value={tpl.id} />
                      <TemplateFields prefix={`t${tpl.id.slice(0, 6)}`} v={tpl} t={e} />
                    </ActionForm>
                    <form action={deleteTemplate}>
                      <input type="hidden" name="id" value={tpl.id} />
                      <ConfirmButton variant="danger" className="!px-2 !py-1 text-xs" message={e.deleteTemplateConfirm}>
                        {e.deleteTemplate}
                      </ConfirmButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{e.newTemplate}</h2>
        <ActionForm action={saveTemplate} submitLabel={e.saveTemplate} pendingLabel={t.crm.saving} resetOnSuccess>
          <TemplateFields prefix="new" t={e} />
        </ActionForm>
      </Card>
    </div>
  );
}
