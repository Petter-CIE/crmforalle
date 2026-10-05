"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseLayout } from "@/lib/dashboard";
import { parseNavPrefs } from "@/lib/nav-items";
import { listWorkspaces, requireWorkspace, WORKSPACE_COOKIE } from "@/lib/session";

export async function switchWorkspace(formData: FormData) {
  const id = String(formData.get("workspace_id") ?? "");
  const workspaces = await listWorkspaces();
  if (workspaces.some((w) => w.id === id)) {
    (await cookies()).set(WORKSPACE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect("/app");
}

/** Saves the user's own layout of the "Today" page; null resets it to the default. */
export async function saveDashboard(items: unknown) {
  const { supabase, user } = await requireWorkspace();
  const layout = items === null ? null : parseLayout(items);
  if (items !== null && !layout) return { ok: false };
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard: layout ? { v: 1, items: layout } : null })
    .eq("id", user.id);
  revalidatePath("/app");
  return { ok: !error };
}

/** Saves the user's own menu (order and hidden sections); null resets it to the default. */
export async function saveNavPrefs(prefs: unknown) {
  const { supabase, user } = await requireWorkspace();
  const parsed = prefs === null ? null : parseNavPrefs(prefs);
  const { error } = await supabase.from("profiles").update({ nav: parsed }).eq("id", user.id);
  revalidatePath("/app", "layout");
  return { ok: !error };
}
