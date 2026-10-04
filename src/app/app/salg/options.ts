import "server-only";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import type { requireWorkspace } from "@/lib/session";
import type { DealOptions } from "./deal-fields";
import { stageName } from "@/lib/stages";
import { loadPipelines, orderStages } from "@/lib/pipelines";

export async function loadDealOptions(ctx: Awaited<ReturnType<typeof requireWorkspace>>): Promise<DealOptions> {
  const { supabase, workspace } = ctx;
  const { locale } = await getI18n();
  const [pipelines, stages, projects, members] = await Promise.all([
    loadPipelines(supabase, workspace.id),
    supabase.from("pipeline_stages").select("id, name, pipeline_id, position, is_won, is_lost").eq("workspace_id", workspace.id),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    listMembers(ctx),
  ]);
  return {
    stages: orderStages(stages.data ?? [], pipelines).map((s) => ({
      id: s.id,
      name: stageName(s.name, locale),
      pipeline_id: s.pipeline_id,
      open: !s.is_won && !s.is_lost,
    })),
    pipelines: pipelines.map((p) => ({ id: p.id, name: p.name })),
    projects: projects.data ?? [],
    members,
  };
}
