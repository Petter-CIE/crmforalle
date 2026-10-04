import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, me, microsoftEnabled } from "@/lib/microsoft";
import { canEncrypt, seal } from "@/lib/secret-box";
import { requireWorkspace, siteUrl } from "@/lib/session";

/** Back from Microsoft: stores the (encrypted) refresh token for this user in the current company. */
export async function GET(req: NextRequest) {
  const { supabase, user, workspace } = await requireWorkspace();
  const back = (q: string) => NextResponse.redirect(new URL(`/app/konto?ms=${q}#microsoft`, siteUrl()));
  const jar = await cookies();
  const expected = jar.get("ms_oauth_state")?.value;
  const wantedProject = jar.get("ms_oauth_project")?.value ?? "";
  jar.delete({ name: "ms_oauth_state", path: "/app/konto/microsoft" });
  jar.delete({ name: "ms_oauth_project", path: "/app/konto/microsoft" });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!microsoftEnabled() || !canEncrypt()) return back("feil");
  if (!code || !state || !expected || state !== expected) return back(req.nextUrl.searchParams.get("error") === "access_denied" ? "avbrutt" : "feil");
  try {
    const tokens = await exchangeCode(code, `${siteUrl()}/app/konto/microsoft/callback`);
    if (!tokens.refresh_token) return back("feil");
    const email = await me(tokens.access_token).catch(() => "");
    if (!email) return back("feil");
    const { data: project } = /^[0-9a-f-]{36}$/i.test(wantedProject)
      ? await supabase.from("projects").select("id").eq("id", wantedProject).eq("workspace_id", workspace.id).maybeSingle()
      : { data: null };
    // One row per mailbox: connecting the same address again refreshes it (and its project).
    const { data: existing } = await supabase
      .from("mail_connections")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .ilike("account_email", email)
      .maybeSingle();
    const row = { account_email: email, refresh_token: seal(tokens.refresh_token), project_id: project?.id ?? null, last_error: null };
    const { error } = existing
      ? await supabase.from("mail_connections").update(row).eq("id", existing.id)
      : await supabase.from("mail_connections").insert({ ...row, workspace_id: workspace.id, user_id: user.id, provider: "microsoft" });
    if (error) {
      console.error("mail connection save failed", error.message);
      return back("feil");
    }
    return back("ok");
  } catch (e) {
    console.error("microsoft connect failed", e instanceof Error ? e.message : e);
    return back("feil");
  }
}
