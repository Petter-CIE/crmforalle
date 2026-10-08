"use server";

import { hasTeamFeatures } from "@/lib/plan-features";
import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";
import { createMailerClient } from "@/lib/supabase/mailer";
import type { MemberRole } from "@/lib/database.types";

export type FormState = { ok?: boolean; error?: string; message?: string; link?: string };

const ASSIGNABLE: MemberRole[] = ["admin", "user"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Project ids from the form that really are projects of this company. */
async function validProjectIds(
  supabase: Awaited<ReturnType<typeof managerContext>>["supabase"],
  workspaceId: string,
  formData: FormData,
) {
  const wanted = [...new Set(formData.getAll("project_ids").map(String).filter((v) => UUID.test(v)))];
  if (wanted.length === 0) return [];
  const { data } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).in("id", wanted);
  return (data ?? []).map((p) => p.id);
}

async function managerContext() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) throw new Error("Ingen tilgang");
  return ctx;
}

export async function updateWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, workspace } = await managerContext();
  const { t } = await getI18n();
  const name = String(formData.get("name") ?? "").trim();
  const org = String(formData.get("org_number") ?? "").replace(/\s/g, "");
  if (!name) return { error: t.settings.nameEmpty };
  if (org && !/^\d{9}$/.test(org)) return { error: t.common.orgNumberDigits };

  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.slice(0, 200), org_number: org || null })
    .eq("id", workspace.id);
  if (error) return { error: t.settings.saveFailed };
  revalidatePath("/app", "layout");
  return { ok: true, message: t.settings.saved };
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, workspace } = await managerContext();
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "user") as MemberRole;
  const fullName = String(formData.get("full_name") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.common.invalidEmail };
  if (!ASSIGNABLE.includes(role)) return { error: t.settings.invalidRole };
  // Admins always see everything, so only plain users can be limited to projects (a Bedrift feature).
  const projectIds = role === "user" && hasTeamFeatures(workspace.plan) ? await validProjectIds(supabase, workspace.id, formData) : [];

  const { data, error } = await supabase
    .from("invitations")
    .insert({ workspace_id: workspace.id, email, full_name: fullName || null, phone: phone || null, role, invited_by: user.id, project_ids: projectIds })
    .select("token")
    .single();
  if (error) {
    return {
      error: error.code === "23505" ? t.settings.alreadyInvited : t.settings.inviteFailed,
    };
  }
  revalidatePath("/app/team");

  const link = `${siteUrl()}/invitasjon/${data.token}`;
  // Send a login e-mail that lands on the invitation page. Uses Supabase Auth e-mail.
  const { error: mailError } = await createMailerClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent(`/invitasjon/${data.token}`)}`,
      shouldCreateUser: true,
    },
  });

  if (mailError) {
    return {
      ok: true,
      message: mailError.status === 429 ? t.settings.inviteMailLimited(email) : t.settings.inviteMailFailed(email),
      link,
    };
  }
  return {
    ok: true,
    message: t.settings.inviteSent(email),
    link,
  };
}

export async function revokeInvitation(formData: FormData) {
  const { supabase, workspace } = await managerContext();
  await supabase.from("invitations").delete().eq("id", String(formData.get("id"))).eq("workspace_id", workspace.id);
  revalidatePath("/app/team");
}

export async function changeRole(formData: FormData) {
  const { supabase, user, workspace } = await managerContext();
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as MemberRole;
  if (!ASSIGNABLE.includes(role) || userId === user.id) return;
  await supabase.from("members").update({ role }).eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/team");
}

/** Limits a user to the chosen projects, or with none chosen gives access to the whole company. */
export async function setMemberProjects(formData: FormData) {
  const { supabase, user, workspace } = await managerContext();
  const userId = String(formData.get("user_id"));
  if (!UUID.test(userId) || userId === user.id) return;
  const projectIds = await validProjectIds(supabase, workspace.id, formData);
  // Limiting users to projects is a Bedrift feature; on Start a limit can only be removed.
  if (projectIds.length > 0 && !hasTeamFeatures(workspace.plan)) return;

  const { error: delError } = await supabase
    .from("project_members")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);
  if (delError) throw delError;
  if (projectIds.length > 0) {
    const { error } = await supabase
      .from("project_members")
      .insert(projectIds.map((pid) => ({ workspace_id: workspace.id, project_id: pid, user_id: userId, added_by: user.id })));
    if (error) throw error;
  }
  const { error } = await supabase
    .from("members")
    .update({ restricted: projectIds.length > 0 })
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) throw error;
  revalidatePath("/app", "layout");
}

export async function removeMember(formData: FormData) {
  const { supabase, user, workspace } = await managerContext();
  const userId = String(formData.get("user_id"));
  if (userId === user.id) return;
  await supabase.from("members").delete().eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/team");
}

const LOGO_PATH = /^[0-9a-f-]{36}\/logo-\d+\.(png|jpg)$/;

/** Sets (or with null removes) the company logo after the browser has uploaded it to storage. */
export async function setWorkspaceLogo(path: string | null): Promise<{ ok: boolean }> {
  const { supabase, workspace } = await managerContext();
  if (path !== null && (!LOGO_PATH.test(path) || !path.startsWith(`${workspace.id}/`))) return { ok: false };
  const { data: before } = await supabase.from("workspaces").select("logo_path").eq("id", workspace.id).maybeSingle();
  const { error } = await supabase.from("workspaces").update({ logo_path: path }).eq("id", workspace.id);
  if (error) return { ok: false };
  if (before?.logo_path && before.logo_path !== path) await supabase.storage.from("logos").remove([before.logo_path]);
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Owner/admin corrects a colleague's name and phone (the owner's own details only by the owner). */
export async function updateMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, workspace } = await managerContext();
  const { t } = await getI18n();
  const userId = String(formData.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: t.crm.error };
  const { error } = await supabase.rpc("update_member_profile", {
    p_workspace: workspace.id,
    p_user: userId,
    p_full_name: String(formData.get("full_name") ?? "").replace(/\s+/g, " "),
    p_phone: String(formData.get("phone") ?? ""),
  });
  if (error) return { error: t.crm.error };
  revalidatePath("/app/team");
  revalidatePath("/app", "layout");
  return { ok: true, message: t.settings.memberSaved };
}
