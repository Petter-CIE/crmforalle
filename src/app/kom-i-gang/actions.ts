"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/session";

export type OnboardingState = { error?: string };

export async function createWorkspace(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { t } = await getI18n();
  const name = String(formData.get("name") ?? "").trim();
  const orgRaw = String(formData.get("org_number") ?? "").replace(/\s/g, "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!name) return { error: t.onboarding.nameRequired };
  if (orgRaw && !/^\d{9}$/.test(orgRaw)) return { error: t.common.orgNumberDigits };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/logg-inn");

  if (fullName) {
    await supabase.from("profiles").update({ full_name: fullName.slice(0, 200) }).eq("id", auth.user.id);
  }

  const { data: workspaceId, error } = await supabase.rpc("create_workspace", {
    p_name: name.slice(0, 200),
    p_org_number: orgRaw || undefined,
  });
  if (error || !workspaceId) return { error: t.onboarding.failed };

  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/app");
}
