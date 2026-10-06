"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/session";

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: workspaceId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  const fullName = String(formData.get("full_name") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!error && workspaceId && fullName) {
    // the name colleagues see instead of the e-mail address
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) await supabase.from("profiles").update({ full_name: fullName }).eq("id", auth.user.id);
  }
  if (error || !workspaceId) {
    const reason = error?.message.includes("another email") ? "epost" : "ugyldig";
    redirect(`/invitasjon/${encodeURIComponent(token)}?feil=${reason}`);
  }
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/app");
}
