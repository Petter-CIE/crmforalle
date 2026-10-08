"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { notifyDeletionScheduled, notifyTeamDeletion } from "@/lib/notify";
import { listWorkspaces, requireUser, requireWorkspace, WORKSPACE_COOKIE } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

type Billing = { plan: string; payment_method: string | null; stripe_subscription_id: string | null };

async function billing(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<Billing | null> {
  const { data } = await supabase.from("workspaces").select("plan, payment_method, stripe_subscription_id").eq("id", id).maybeSingle();
  return data;
}

/** Stops (or resumes) renewal of a card subscription. Best effort: the deletion goes ahead regardless. */
async function setCardRenewal(b: Billing | null, renew: boolean) {
  const stripe = getStripe();
  if (!stripe || !b?.stripe_subscription_id) return;
  try {
    await stripe.subscriptions.update(b.stripe_subscription_id, { cancel_at_period_end: !renew });
  } catch (e) {
    console.error("stripe renewal change failed", e instanceof Error ? e.message : e);
  }
}

/** Owner asks for the whole company to be deleted (in 30 days). */
export async function requestCompanyDeletion(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const d = t.deletion;
  if (workspace.role !== "owner") return { error: d.onlyOwner };
  const confirm = String(formData.get("confirm_name") ?? "").trim();
  if (confirm !== workspace.name) return { error: d.nameMismatch };

  const b = await billing(supabase, workspace.id);
  const { data: when, error } = await supabase.rpc("request_workspace_deletion", { p_workspace: workspace.id, p_confirm_name: confirm });
  if (error || !when) {
    console.error("deletion request failed", error?.message);
    return { error: error?.message.includes("name_mismatch") ? d.nameMismatch : d.failed };
  }

  await setCardRenewal(b, false);
  const { data: members } = await supabase
    .from("members")
    .select("role, profiles(full_name, email)")
    .eq("workspace_id", workspace.id)
    .in("role", ["owner", "admin"]);
  const recipients = (members ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { full_name: string | null; email: string } => !!p?.email)
    .map((p) => ({ email: p.email, name: p.full_name }));
  await Promise.all([
    notifyDeletionScheduled({ workspaceName: workspace.name, orgNumber: workspace.org_number, scheduledFor: when, recipients }),
    notifyTeamDeletion({
      event: "requested",
      workspaceName: workspace.name,
      orgNumber: workspace.org_number,
      plan: b?.plan ?? workspace.plan,
      paymentMethod: b?.payment_method ?? null,
      scheduledFor: when,
      by: user.email ?? null,
    }),
  ]);
  redirect("/slettes");
}

/** Owner undoes the deletion while the 30 days are running. */
export async function cancelCompanyDeletion() {
  const ctx = await requireUser();
  const workspaces = await listWorkspaces(ctx);
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  if (!workspace?.deletion_requested_at || workspace.role !== "owner") redirect("/app");

  const { error } = await ctx.supabase.rpc("cancel_workspace_deletion", { p_workspace: workspace.id });
  if (error) {
    console.error("deletion cancel failed", error.message);
    redirect("/slettes?feil=1");
  }
  const b = await billing(ctx.supabase, workspace.id);
  await setCardRenewal(b, true);
  await notifyTeamDeletion({
    event: "cancelled",
    workspaceName: workspace.name,
    orgNumber: workspace.org_number,
    plan: b?.plan ?? workspace.plan,
    paymentMethod: b?.payment_method ?? null,
    by: ctx.user.email ?? null,
  });
  redirect("/app?angret=1");
}

/** A user deletes their own login. Owners must delete their companies first. */
export async function deleteMyAccount(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireUser();
  const { t } = await getI18n();
  const d = t.deletion;
  const email = String(formData.get("confirm_email") ?? "").trim();
  if (email.toLowerCase() !== (user.email ?? "").toLowerCase()) return { error: d.emailMismatch };
  const { error } = await supabase.rpc("delete_my_account", { p_confirm_email: email });
  if (error) {
    console.error("account deletion failed", error.message);
    if (error.message.includes("owns_workspace")) return { error: d.ownsCompany };
    if (error.message.includes("email_mismatch")) return { error: d.emailMismatch };
    return { error: d.failed };
  }
  // The user is gone; clear the session cookies on this device.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  (await cookies()).delete(WORKSPACE_COOKIE);
  redirect("/");
}
