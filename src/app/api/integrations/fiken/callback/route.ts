import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { syncFiken } from "@/lib/accounting/fiken-sync";
import { fikenCompanies, FikenError, fikenEnabled, fikenExchangeCode, type FikenCreds } from "@/lib/fiken";
import { canEncrypt, seal } from "@/lib/secret-box";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";

export const maxDuration = 60;

/**
 * Back from Fiken: stores the (encrypted) tokens. With a single Fiken company it is chosen and synced
 * right away; with several, the settings page asks which one.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const back = (q: string) => NextResponse.redirect(new URL(`/app/innstillinger?fiken=${q}#regnskap`, siteUrl()));
  const jar = await cookies();
  const expected = jar.get("fiken_oauth_state")?.value ?? "";
  jar.delete({ name: "fiken_oauth_state", path: "/api/integrations/fiken" });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error") === "access_denied") return back("avbrutt");
  // the state is bound to the company that started the flow
  if (!code || !state || expected !== `${workspace.id}.${state}`) return back("feil");
  if (!canManage(workspace.role) || !fikenEnabled() || !canEncrypt()) return back("feil");

  try {
    const tokens = await fikenExchangeCode(code, state);
    const companies = await fikenCompanies(tokens.access);
    const only = companies.length === 1 ? companies[0] : null;
    const creds: FikenCreds = { ...tokens, slug: only?.slug ?? null };
    const { error } = await supabase.rpc("save_integration", {
      p_workspace: workspace.id,
      p_provider: "fiken",
      p_credentials: seal(JSON.stringify(creds)),
      p_company: only?.name ?? "",
    });
    if (error) {
      console.error("fiken save failed", error.message);
      return back("feil");
    }
    if (!only) return back(companies.length === 0 ? "ingen" : "velg");
    if (only.hasApiAccess === false) return back("api");

    const { data: claimed } = await supabase.rpc("integration_claim_sync", { p_workspace: workspace.id, p_provider: "fiken" });
    if (!claimed) return back("ok");
    try {
      await syncFiken(supabase, workspace.id, ctx.user.id);
      await supabase.rpc("integration_synced", { p_workspace: workspace.id, p_provider: "fiken", p_error: null });
      return back("ok");
    } catch (e) {
      const forbidden = e instanceof FikenError && e.status === 403;
      const message = forbidden ? "fiken_403" : e instanceof Error ? e.message : String(e);
      console.error("fiken first sync failed", message);
      await supabase.rpc("integration_synced", { p_workspace: workspace.id, p_provider: "fiken", p_error: message });
      return back(forbidden ? "api" : "synkfeil");
    }
  } catch (e) {
    console.error("fiken connect failed", e instanceof Error ? e.message : e);
    return back("feil");
  }
}
