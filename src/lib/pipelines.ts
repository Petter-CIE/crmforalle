import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Pipeline = { id: string; name: string; position: number };

/** The company's pipelines in their order (every company has at least one). */
export async function loadPipelines(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Pipeline[]> {
  const { data } = await supabase.from("pipelines").select("id, name, position").eq("workspace_id", workspaceId).order("position").order("created_at");
  return data ?? [];
}

/** The pipeline asked for in the URL, or the first one. */
export function pickPipeline(pipelines: Pipeline[], wanted: unknown): Pipeline | null {
  return pipelines.find((p) => p.id === wanted) ?? pipelines[0] ?? null;
}

/** Stages sorted by pipeline order, then by their own position. */
export function orderStages<T extends { pipeline_id: string; position: number }>(stages: T[], pipelines: Pipeline[]): T[] {
  const rank = new Map(pipelines.map((p, i) => [p.id, i]));
  return [...stages].sort((a, b) => (rank.get(a.pipeline_id) ?? 99) - (rank.get(b.pipeline_id) ?? 99) || a.position - b.position);
}

/** "Stage" with one pipeline, "Pipeline · Stage" with several. */
export function stageLabel(name: string, pipelineId: string, pipelines: Pipeline[]) {
  if (pipelines.length < 2) return name;
  const p = pipelines.find((x) => x.id === pipelineId);
  return p ? `${p.name} · ${name}` : name;
}
