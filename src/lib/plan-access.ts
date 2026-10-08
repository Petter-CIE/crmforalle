import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlanType } from "@/lib/database.types";
import { hasOutlook } from "@/lib/plan-features";

/** Whether the company may sync Outlook / Microsoft 365 (Bedrift, trial, free, or Start with the add-on). */
export async function outlookAllowed(supabase: SupabaseClient<Database>, workspace: { id: string; plan: PlanType }) {
  if (workspace.plan !== "start") return hasOutlook(workspace);
  const { data } = await supabase.from("workspaces").select("outlook_addon").eq("id", workspace.id).maybeSingle();
  return hasOutlook({ plan: workspace.plan, outlook_addon: data?.outlook_addon });
}
