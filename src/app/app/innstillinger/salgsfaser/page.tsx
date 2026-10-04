import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { stageName } from "@/lib/stages";
import { StageEditor, type EditorStage } from "./stage-editor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.customize.stages.title };
}

export default async function StagesPage() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) notFound();
  const { t, locale } = await getI18n();
  const st = t.customize.stages;
  const [{ data: stages }, { data: deals }, { data: autos }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name, probability, position, is_won, is_lost").eq("workspace_id", workspace.id).order("position"),
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
      <PageHeader title={st.title} subtitle={st.intro} backHref="/app/innstillinger" backLabel={t.settings.title} />
      <StageEditor
        key={JSON.stringify(list)}
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
