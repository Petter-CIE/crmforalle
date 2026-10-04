import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { formatDateTime, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { createLeadForm } from "../customize-actions";
import { LeadFormFields } from "./fields";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.leads.title };
}

export default async function LeadFormsPage() {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  if (!canManage(workspace.role)) notFound();
  const { t, dateLocale } = await getI18n();
  const l = t.leads;
  const [{ data: forms }, members, { data: projects }] = await Promise.all([
    supabase.from("lead_forms").select("id, name, active, submissions, last_submission_at").eq("workspace_id", workspace.id).order("created_at"),
    listMembers(ctx),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={l.title} subtitle={l.intro} backHref="/app/innstillinger" backLabel={t.settings.title} />
      <Card>
        {(forms ?? []).length === 0 ? (
          <EmptyState>{l.empty}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {(forms ?? []).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link href={`/app/innstillinger/skjema/${f.id}`} className="font-medium hover:text-brand">
                    🌐 {f.name}
                  </Link>
                  {!f.active && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">{l.inactive}</span>}
                  <p className="text-xs text-muted">{l.stats(f.submissions, f.last_submission_at ? formatDateTime(f.last_submission_at, dateLocale) : null)}</p>
                </div>
                <Link href={`/app/innstillinger/skjema/${f.id}`} className="text-sm text-brand hover:underline">
                  {l.edit} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{l.new}</h2>
        <ActionForm action={createLeadForm} submitLabel={l.create} pendingLabel={t.crm.saving}>
          <LeadFormFields
            v={{
              name: "",
              owner_id: user.id,
              project_id: null,
              create_deal: true,
              create_task: true,
              ask_phone: true,
              ask_company: true,
              require_message: false,
              title: null,
              intro: null,
              button_text: null,
              thank_you: null,
            }}
            members={members}
            projects={projects ?? []}
            t={l}
          />
        </ActionForm>
      </Card>
    </div>
  );
}
