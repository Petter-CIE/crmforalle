import type { Metadata } from "next";
import { hasTeamFeatures } from "@/lib/plan-features";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { stageName } from "@/lib/stages";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Notice, Select } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { loadPipelines, pickPipeline } from "@/lib/pipelines";
import { createPipeline, deletePipeline, renamePipeline } from "../customize-actions";
import { StageEditor, type EditorStage } from "./stage-editor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.customize.stages.title };
}

export default async function StagesPage({ searchParams }: PageProps<"/app/innstillinger/salgsfaser">) {
  const sp = await searchParams;
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) notFound();
  const { t, locale } = await getI18n();
  const st = t.customize.stages;
  const pl = t.pipelines;
  const pipelines = await loadPipelines(supabase, workspace.id);
  const pipeline = pickPipeline(pipelines, sp.pipeline);
  if (!pipeline) notFound();
  const [{ data: stages }, { data: deals }, { data: autos }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, probability, position, is_won, is_lost")
      .eq("workspace_id", workspace.id)
      .eq("pipeline_id", pipeline.id)
      .order("position"),
    supabase.from("deals").select("stage_id").eq("workspace_id", workspace.id).limit(20000),
    supabase.from("automations").select("stage_id").eq("workspace_id", workspace.id),
  ]);
  const count = new Map<string, number>();
  for (const d of deals ?? []) count.set(d.stage_id, (count.get(d.stage_id) ?? 0) + 1);
  const withAuto = new Set((autos ?? []).map((a) => a.stage_id));
  const list: EditorStage[] = (stages ?? []).map((s) => ({
    key: s.id,
    id: s.id,
    name: stageName(s.name, locale),
    probability: s.probability,
    kind: s.is_won ? "won" : s.is_lost ? "lost" : "open",
    deals: count.get(s.id) ?? 0,
    hasAutomation: withAuto.has(s.id),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={st.title} subtitle={st.intro} backHref={`/app/salg?pipeline=${pipeline.id}`} backLabel={t.deals.title} />

      <Card>
        <h2 className="font-semibold">{pl.title}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{pl.intro}</p>
        <nav aria-label={pl.label} className="flex flex-wrap gap-2">
          {pipelines.map((p) => {
            const active = p.id === pipeline.id;
            return (
              <Link
                key={p.id}
                href={`/app/innstillinger/salgsfaser?pipeline=${p.id}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm ${active ? "border-brand bg-brand text-white" : "border-border bg-surface hover:border-brand hover:text-brand"}`}
              >
                {p.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {hasTeamFeatures(workspace.plan) || pipelines.length === 0 ? (
            <ActionForm action={createPipeline} submitLabel={pl.create} pendingLabel={t.crm.saving} className="space-y-3">
              <Field label={pl.newName} htmlFor="pl_new">
                <Input id="pl_new" name="name" required maxLength={60} placeholder={pl.newPlaceholder} className="w-full" />
              </Field>
            </ActionForm>
          ) : (
            <Notice>
            {t.planGate.pipelines}{" "}
            <Link href="/app/abonnement" className="font-medium underline">
              {t.planGate.upgrade}
            </Link>
          </Notice>
          )}
          <ActionForm key={pipeline.id} action={renamePipeline} submitLabel={pl.renameSave} pendingLabel={t.crm.saving} className="space-y-3">
            <input type="hidden" name="id" value={pipeline.id} />
            <Field label={pl.rename} htmlFor="pl_name">
              <Input id="pl_name" name="name" required maxLength={60} defaultValue={pipeline.name} className="w-full" />
            </Field>
          </ActionForm>
        </div>
        {pipelines.length > 1 && (
          <details className="mt-5 rounded-lg border border-red-200 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-danger">
              {pl.delete}: {pipeline.name}
            </summary>
            <p className="mb-3 mt-2 text-muted">{pl.deleteConfirm}</p>
            <ActionForm key={`del-${pipeline.id}`} action={deletePipeline} submitLabel={pl.delete} pendingLabel={t.crm.saving} className="space-y-3">
              <input type="hidden" name="id" value={pipeline.id} />
              <Field label={pl.moveTo} htmlFor="pl_move">
                <Select id="pl_move" name="move_to" className="w-full">
                  {pipelines
                    .filter((p) => p.id !== pipeline.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </ActionForm>
          </details>
        )}
      </Card>

      <h2 className="font-semibold">
        {st.title}: {pipeline.name}
      </h2>
      <StageEditor
        key={JSON.stringify(list)}
        pipelineId={pipeline.id}
        initial={list}
        t={{
          open: st.open,
          closed: st.closed,
          closedHint: st.closedHint,
          name: st.name,
          probability: st.probability,
          add: st.add,
          newStage: st.newStage,
          remove: st.remove,
          undoRemove: st.undoRemove,
          removedNote: st.removedNote,
          autoWarning: st.autoWarning,
          save: st.save,
          saving: st.saving,
          drag: st.drag,
          defaultNote: st.defaultNote,
          moveUp: t.ui.dash.moveUp,
          moveDown: t.ui.dash.moveDown,
          dealsTemplate: st.deals(999).replace("999", "{n}"),
          moveTemplate: st.moveDealsTo(999).replace("999", "{n}"),
        }}
      />
    </div>
  );
}
