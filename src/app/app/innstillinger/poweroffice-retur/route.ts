import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { savePowerOfficeKey } from "@/lib/accounting/run-sync";
import { powerOfficeEnabled, powerOfficeFinalize } from "@/lib/poweroffice";
import { canEncrypt } from "@/lib/secret-box";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";

export const maxDuration = 60;

const RETURN_PATH = "/app/innstillinger/poweroffice-retur";

// Go's documentation does not pin down the parameter name of the one-time token, so the usual
// spellings are accepted.
const TOKEN_NAMES = ["token", "onboardingToken", "OnboardingToken", "onboarding_token"];

/** Statuses Go may send back instead of a token. */
const STATUS_FLASH: Record<string, string> = {
  canceled: "avbrutt",
  cancelled: "avbrutt",
  clientnotfound: "ikkefunnet",
  noclientaccess: "ingentilgang",
  integrationblocked: "blokkert",
};

/** Back from PowerOffice Go after the user activated AllSeats: swaps the token for the client key. */
export async function GET(req: NextRequest) {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const back = (q: string) => NextResponse.redirect(new URL(`/app/innstillinger?poweroffice=${q}#regnskap`, siteUrl()), 303);
  const params = req.nextUrl.searchParams;

  const jar = await cookies();
  const expected = jar.get("po_onboarding_state")?.value ?? "";
  jar.delete({ name: "po_onboarding_state", path: RETURN_PATH });

  const status = (params.get("status") ?? params.get("Status") ?? "").toLowerCase();
  if (STATUS_FLASH[status]) return back(STATUS_FLASH[status]);
  const token = TOKEN_NAMES.map((n) => params.get(n)).find((v) => !!v) ?? req.headers.get("x-onboarding-token") ?? "";
  if (!token) {
    console.error("poweroffice onboarding: no token", { params: [...params.keys()], status });
    return back("feil");
  }
  // The state is bound to the company that started the flow.
  const state = params.get("state") ?? "";
  if (!state || expected !== `${workspace.id}.${state}`) return back("feil");
  if (!canManage(workspace.role) || !powerOfficeEnabled() || !canEncrypt()) return back("feil");
  const { data: billing } = await supabase.from("workspaces").select("plan, accounting_addon").eq("id", workspace.id).single();
  if (!billing || !hasAccountingAccess(billing)) return back("feil");

  try {
    const clients = await powerOfficeFinalize(token);
    // Several clients can be onboarded at once; this company uses the one with its org number.
    const org = workspace.org_number?.replace(/\D/g, "") ?? "";
    const client = clients.find((c) => org && c.ClientOrganizationNumber?.replace(/\D/g, "") === org) ?? clients[0];
    if (!client) return back("feil");
    const { sync } = await savePowerOfficeKey(ctx, client.ClientKey);
    return back(sync.ok ? "ok" : "synkfeil");
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    console.error("poweroffice onboarding failed", code);
    return back(code.startsWith("poweroffice_privileges:") ? "tilgang" : "feil");
  }
}

/**
 * In case Go posts the token instead: a cross-site POST carries no login cookies, so it is turned
 * into a GET on the same address (303), where the session and the state cookie are available.
 */
export async function POST(req: NextRequest) {
  const url = new URL(RETURN_PATH, siteUrl());
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
  const form = new URLSearchParams(await req.text().catch(() => ""));
  form.forEach((v, k) => url.searchParams.set(k, v));
  return NextResponse.redirect(url, 303);
}
