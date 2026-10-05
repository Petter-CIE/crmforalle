import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { emailFromIdToken, exchangeCode, googleEnabled } from "@/lib/google";
import { canEncrypt, seal } from "@/lib/secret-box";
import { requireWorkspace, siteUrl } from "@/lib/session";

/** Back from Google: stores the (encrypted) refresh token for this user's calendar in the current company. */
export async function GET(req: NextRequest) {
  const { supabase, user, workspace } = await requireWorkspace();
  const back = (q: string, why = "") =>
    NextResponse.redirect(new URL(`/app/konto?g=${q}${why ? `&gw=${encodeURIComponent(why.slice(0, 120))}` : ""}#google`, siteUrl()));
  const jar = await cookies();
  const expected = jar.get("g_oauth_state")?.value;
  jar.delete({ name: "g_oauth_state", path: "/app/konto/google" });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!googleEnabled() || !canEncrypt()) return back("feil", "not configured");
  if (!code || !state || !expected || state !== expected) {
    const err = req.nextUrl.searchParams.get("error");
    return err === "access_denied" ? back("avbrutt") : back("feil", err ?? "state");
  }
  try {
    const tokens = await exchangeCode(code, `${siteUrl()}/app/konto/google/callback`);
    if (!tokens.refresh_token) return back("feil", "no refresh token");
    const email = emailFromIdToken(tokens.id_token);
    if (!email) return back("feil", "no e-mail");
    // One Google calendar per user and company: connecting again replaces it.
    await supabase.from("mail_connections").delete().eq("workspace_id", workspace.id).eq("user_id", user.id).eq("provider", "google");
    const { error } = await supabase.from("mail_connections").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      provider: "google",
      account_email: email,
      refresh_token: seal(tokens.refresh_token),
      mail_enabled: false,
      calendar_enabled: true,
    });
    if (error) {
      console.error("google connection save failed", error.message);
      return back("feil", `save: ${error.message}`);
    }
    return back("ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("google connect failed", msg);
    return back("feil", msg);
  }
}
