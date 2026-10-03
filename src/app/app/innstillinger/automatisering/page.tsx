import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, Input, Select } from "@/components/ui";
import { EmptyState, Field, PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { createAutomation, deleteAutomation, toggleAutomation } from "../customize-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.customize.autoTitle };
}

export default async function AutomationsPage() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) notFound();
  const { t } = await getI18n();
  const c = t.customize;
  const [{ data: stages }, { data: rules }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name").eq("workspace_id", workspace.id).order("position"),
    supabase
      .from("automations")
      .select("id, stage_id, task_title, due_days, active")
      .eq("workspace_id", workspace.id)
      .order("created_at"),
  ]);
  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <PageHeader title={c.autoTitle} subtitle={c.autoIntro} backHref="/app/innstillinger" backLabel={t.settings.title} />

      <Card>
        <h2 className="mb-4 font-semibold">{c.newRule}</h2>
        <ActionForm action={createAutomation} submitLabel={c.addRule} pendingLabel={t.crm.saving} resetOnSuccess successText={c.ruleAdded}>
          <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_8rem]">
            <Field label={c.whenStage} htmlFor="a_stage">
              <Select id="a_stage" name="stage_id" required className="w-full">
                {(stages ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={c.createTask} htmlFor="a_title">
              <Input id="a_title" name="task_title" required maxLength={200} placeholder={c.taskPlaceholder} />
            </Field>
            <Field label={c.dueIn} htmlFor="a_days">
              <Input id="a_days" name="due_days" type="number" min={0} max={365} defaultValue={3} required />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted">{c.ruleHelp}</p>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{c.rules}</h2>
        {(rules ?? []).length === 0 ? (
          <EmptyState>{c.noRules}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {(rules ?? []).map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-3 py-2 text-sm ${r.active ? "" : "text-muted"}`}>
                <span className="min-w-0 flex-1">{c.ruleText(stageName.get(r.stage_id) ?? "?", r.task_title, r.due_days)}</span>
                <form action={toggleAutomation}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                  <button type="submit" className="rounded px-2 py-1 text-xs text-brand hover:bg-background">
                    {r.active ? c.pause : c.resume}
                  </button>
                </form>
                <form action={deleteAutomation}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton variant="danger" className="!px-2 !py-1 text-xs" message={t.crm.confirmDelete}>
                    {t.crm.delete}
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
