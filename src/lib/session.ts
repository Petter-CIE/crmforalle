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
  role: MemberRole;
};

/** Logged-in user or redirect to login. */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/logg-inn");
  return { supabase, user: data.user };
}

/** All workspaces the user belongs to, with their role. */
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("members")
    .select("role, workspaces(id, name, org_number, plan, trial_ends_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((m) => m.workspaces)
    .map((m) => ({ ...m.workspaces!, role: m.role }));
}

/** Current workspace (from cookie, else the first one) or redirect to onboarding. */
export async function requireWorkspace() {
  const { supabase, user } = await requireUser();
  const workspaces = await listWorkspaces();
  if (workspaces.length === 0) redirect("/kom-i-gang");
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  return { supabase, user, workspace, workspaces };
}

export function canManage(role: MemberRole) {
  return role === "owner" || role === "admin";
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
