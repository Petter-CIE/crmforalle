import "server-only";
import { listMembers } from "@/lib/crm";
import type { requireWorkspace } from "@/lib/session";
import type { DealOptions } from "./deal-fields";

export async function loadDealOptions(ctx: Awaited<ReturnType<typeof requireWorkspace>>): Promise<DealOptions> {
  const { supabase, workspace } = ctx;
  const [stages, projects, members] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name").eq("workspace_id", workspace.id).order("position"),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    listMembers(ctx),
  ]);
  return {
    stages: stages.data ?? [],
    projects: projects.data ?? [],
    members,
  };
}
