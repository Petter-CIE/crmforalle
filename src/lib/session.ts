import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, PlanType } from "@/lib/database.types";

export const WORKSPACE_COOKIE = "cfa_ws";

export type WorkspaceSummary = {
  id: string;
  name: string;
  org_number: string | null;
  plan: PlanType;
  trial_ends_at: string;
  suspended_at: string | null;
  /** Set when the owner has asked for the company to be deleted; it is deleted on deletion_scheduled_for. */
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  logo_path: string | null;
  role: MemberRole;
  /** Limited to the projects they are added to (only applies to the "user" role). */
  restricted: boolean;
};

type GuardOptions = {
  /** Skip the "must have a password" check (used by the set-password page). */
  allowNoPassword?: boolean;
  /** Path to return to after an intermediate step (MFA / set password). */
  returnTo?: string;
};

/**
 * Logged-in user or redirect to login. Also enforces:
 * - two-step verification when the user has enabled it (AAL2),
 * - that the user has chosen a password (users created by an invitation link).
 */
type AalData = {
  currentLevel: string | null;
  nextLevel: string | null;
  currentAuthenticationMethods: ({ method: string } | string)[];
} | null;

/** A passkey sign-in (device + biometrics/PIN) counts as two-step verification. */
export function signedInWithPasskey(aal: AalData) {
  return !!aal?.currentAuthenticationMethods?.some((m) => (typeof m === "string" ? m : m.method) === "passkey");
}

/** True when the session still needs the authenticator-app code. */
export function needsSecondFactor(aal: AalData) {
  return !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2" && !signedInWithPasskey(aal);
}

export async function requireUser(opts: GuardOptions = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/logg-inn");

  const returnTo = opts.returnTo ?? "/app";
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (needsSecondFactor(aal)) {
    redirect(`/logg-inn/mfa?neste=${encodeURIComponent(returnTo)}`);
  }

  if (!opts.allowNoPassword && !data.user.user_metadata?.has_password) {
    redirect(`/nytt-passord?neste=${encodeURIComponent(returnTo)}`);
  }
  return { supabase, user: data.user };
}

/** All workspaces the user belongs to, with their role. */
export async function listWorkspaces(
  ctx?: Awaited<ReturnType<typeof requireUser>>,
): Promise<WorkspaceSummary[]> {
  const { supabase, user } = ctx ?? (await requireUser());
  const { data, error } = await supabase
    .from("members")
    .select("role, restricted, workspaces(id, name, org_number, plan, trial_ends_at, suspended_at, deletion_requested_at, deletion_scheduled_for, logo_path)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((m) => m.workspaces)
    .map((m) => ({ ...m.workspaces!, role: m.role, restricted: m.restricted }));
}

/** Current workspace (from cookie, else the first one) or redirect to onboarding. */
export async function requireWorkspace(opts: { allowPendingDeletion?: boolean } = {}) {
  const ctx = await requireUser();
  const { supabase, user } = ctx;
  const workspaces = await listWorkspaces(ctx);
  if (workspaces.length === 0) redirect("/kom-i-gang");
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  // Being deleted: the CRM is closed. Only the owner may still export data (and undo the deletion on /slettes).
  if (workspace.deletion_requested_at && !(opts.allowPendingDeletion && workspace.role === "owner")) redirect("/slettes");
  // Access suspended by the platform admin: the CRM stays closed, data is kept.
  if (workspace.suspended_at && !workspace.deletion_requested_at) redirect("/sperret");
  return { supabase, user, workspace, workspaces };
}

export function canManage(role: MemberRole) {
  return role === "owner" || role === "admin";
}

/** A user who only sees the projects they are added to (owners and admins always see everything). */
export function isProjectLimited(workspace: Pick<WorkspaceSummary, "role" | "restricted">) {
  return workspace.role === "user" && workspace.restricted;
}


export function safeNext(value: unknown, fallback = "/app") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // On Vercel, fall back to the project's production domain.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Whole days left of the trial (0 when expired). */
export function trialDaysLeft(trialEndsAt: string) {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

/** Public URL of a workspace logo stored in the "logos" bucket. */
export function logoUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
}
