import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { fikenAuthorizeUrl, fikenEnabled } from "@/lib/fiken";
import { canEncrypt } from "@/lib/secret-box";
import { canManage, requireWorkspace, siteUrl } from "@/lib/session";

/** Sends an owner/admin to Fiken to give AllSeats access to their accounting. */
export async function GET() {
  const { supabase, workspace } = await requireWorkspace();
  const back = (q: string) => NextResponse.redirect(new URL(`/app/innstillinger?fiken=${q}#regnskap`, siteUrl()));
  if (!canManage(workspace.role)) return back("feil");
  const { data: billing } = await supabase.from("workspaces").select("plan, accounting_addon").eq("id", workspace.id).single();
  if (!billing || !hasAccountingAccess(billing)) return back("feil");
  if (!fikenEnabled() || !canEncrypt()) return back("feil");
  const state = randomBytes(24).toString("hex");
  (await cookies()).set("fiken_oauth_state", `${workspace.id}.${state}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/fiken",
    maxAge: 600,
  });
  return NextResponse.redirect(fikenAuthorizeUrl(state));
}
