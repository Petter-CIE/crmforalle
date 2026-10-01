"use server";

import { revalidatePath } from "next/cache";
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
  const name = String(formData.get("name") ?? "").trim();
  const org = String(formData.get("org_number") ?? "").replace(/\s/g, "");
  if (!name) return { error: "Bedriftsnavn kan ikke være tomt." };
  if (org && !/^\d{9}$/.test(org)) return { error: "Organisasjonsnummer må ha 9 siffer." };

  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.slice(0, 200), org_number: org || null })
    .eq("id", workspace.id);
  if (error) return { error: "Kunne ikke lagre. Prøv igjen." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Lagret." };
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, workspace } = await managerContext();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "user") as MemberRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Skriv inn en gyldig e-postadresse." };
  if (!ASSIGNABLE.includes(role)) return { error: "Ugyldig rolle." };

  const { data, error } = await supabase
    .from("invitations")
    .insert({ workspace_id: workspace.id, email, role, invited_by: user.id })
    .select("token")
    .single();
  if (error) {
    return {
      error: error.code === "23505" ? "Denne personen er allerede invitert." : "Kunne ikke opprette invitasjonen.",
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
      message:
        mailError.status === 429
          ? `Invitasjonen er opprettet, men e-post kunne ikke sendes akkurat nå (for mange e-poster). Send lenken til ${email} selv:`
          : `Invitasjonen er opprettet, men e-post kunne ikke sendes. Send lenken til ${email} selv:`,
      link,
    };
  }
  return {
    ok: true,
    message: `Invitasjon sendt på e-post til ${email}. Du kan også dele lenken direkte:`,
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
