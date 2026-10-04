import "server-only";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import type { requireWorkspace } from "@/lib/session";
import type { DealOptions } from "./deal-fields";
import { stageName } from "@/lib/stages";

export async function loadDealOptions(ctx: Awaited<ReturnType<typeof requireWorkspace>>): Promise<DealOptions> {
  const { supabase, workspace } = ctx;
  const { locale } = await getI18n();
  const [stages, projects, members] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name").eq("workspace_id", workspace.id).order("position"),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    listMembers(ctx),
  ]);
  return {
    stages: (stages.data ?? []).map((s) => ({ ...s, name: stageName(s.name, locale) })),
    projects: projects.data ?? [],
    members,
  };
}
