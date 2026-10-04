"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";
import { createMailerClient } from "@/lib/supabase/mailer";
import type { MemberRole } from "@/lib/database.types";

export type FormState = { ok?: boolean; error?: string; message?: string; link?: string };

const ASSIGNABLE: MemberRole[] = ["admin", "user"];

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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.common.invalidEmail };
  if (!ASSIGNABLE.includes(role)) return { error: t.settings.invalidRole };

  const { data, error } = await supabase
    .from("invitations")
    .insert({ workspace_id: workspace.id, email, role, invited_by: user.id })
    .select("token")
    .single();
  if (error) {
    return {
      error: error.code === "23505" ? t.settings.alreadyInvited : t.settings.inviteFailed,
    };
  }
  revalidatePath("/app/innstillinger");

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
  revalidatePath("/app/innstillinger");
}

export async function changeRole(formData: FormData) {
  const { supabase, user, workspace } = await managerContext();
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as MemberRole;
  if (!ASSIGNABLE.includes(role) || userId === user.id) return;
  await supabase.from("members").update({ role }).eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/innstillinger");
}

export async function removeMember(formData: FormData) {
  const { supabase, user, workspace } = await managerContext();
  const userId = String(formData.get("user_id"));
  if (userId === user.id) return;
  await supabase.from("members").delete().eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/innstillinger");
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
