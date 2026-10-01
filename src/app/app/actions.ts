"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listWorkspaces, WORKSPACE_COOKIE } from "@/lib/session";

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
