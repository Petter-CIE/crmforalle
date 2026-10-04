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
  jar.delete({ name: "ms_oauth_state", path: "/app/konto/microsoft" });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!microsoftEnabled() || !canEncrypt()) return back("feil");
  if (!code || !state || !expected || state !== expected) return back(req.nextUrl.searchParams.get("error") === "access_denied" ? "avbrutt" : "feil");
  try {
    const tokens = await exchangeCode(code, `${siteUrl()}/app/konto/microsoft/callback`);
    if (!tokens.refresh_token) return back("feil");
    const email = await me(tokens.access_token).catch(() => "");
    const { error } = await supabase.from("mail_connections").upsert(
      { workspace_id: workspace.id, user_id: user.id, provider: "microsoft", account_email: email || null, refresh_token: seal(tokens.refresh_token) },
      { onConflict: "workspace_id,user_id,provider" },
    );
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
