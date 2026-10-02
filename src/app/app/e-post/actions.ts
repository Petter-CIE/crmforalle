"use server";

import { revalidatePath } from "next/cache";
import { canManage, requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Creates (or replaces) the company's CRM e-mail address. The old address stops working. */
export async function rotateInboundAddress() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) return;
  await supabase.rpc("rotate_inbound_token", { p_workspace: workspace.id });
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/e-post");
}

export async function disableInboundAddress() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) return;
  await supabase.rpc("disable_inbound", { p_workspace: workspace.id });
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/e-post");
}

export async function dismissInboundEmail(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await supabase.from("inbound_emails").delete().eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/e-post");
}
