import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { powerOfficeEnabled, powerOfficeInitiate } from "@/lib/poweroffice";
import { canEncrypt } from "@/lib/secret-box";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";

const RETURN_PATH = "/app/innstillinger/poweroffice-retur";

/**
 * One-click connection: sends an owner/admin to PowerOffice Go to activate AllSeats on their client.
 * With ?alle=1 the user picks among all their Go clients instead of the one with the company's org number.
 */
export async function GET(req: NextRequest) {
  const { supabase, workspace } = await requireWorkspace();
  const back = (q: string) => NextResponse.redirect(new URL(`/app/innstillinger?poweroffice=${q}#regnskap`, siteUrl()));
  if (!canManage(workspace.role)) return back("feil");
  const { data: billing } = await supabase.from("workspaces").select("plan, accounting_addon").eq("id", workspace.id).single();
  if (!billing || !hasAccountingAccess(billing)) return back("feil");
  if (!powerOfficeEnabled() || !canEncrypt()) return back("feil");

  const state = randomBytes(24).toString("hex");
  // Go ignores extra parameters when it checks the redirect URL, so the state rides along in it.
  const redirectUri = `${siteUrl()}${RETURN_PATH}?state=${state}`;
  const orgNumber = req.nextUrl.searchParams.get("alle") === "1" ? null : (workspace.org_number?.replace(/\D/g, "") || null);
  try {
    const url = await powerOfficeInitiate(redirectUri, orgNumber);
    (await cookies()).set("po_onboarding_state", `${workspace.id}.${state}`, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: RETURN_PATH,
      maxAge: 1800,
    });
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("poweroffice onboarding start failed", e instanceof Error ? e.message : e);
    return back("feil");
  }
}
