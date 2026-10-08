import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrl, microsoftEnabled } from "@/lib/microsoft";
import { outlookAllowed } from "@/lib/plan-access";
import { requireWorkspace, siteUrl } from "@/lib/session";

/** Sends the user to Microsoft to connect their Outlook mailbox and calendar. */
export async function GET(req: Request) {
  const { supabase, workspace } = await requireWorkspace();
  // Outlook sync is in Bedrift, or an add-on to Start.
  if (!(await outlookAllowed(supabase, workspace))) return NextResponse.redirect(new URL("/app/konto?outlook=tillegg#microsoft", siteUrl()));
  const project = new URL(req.url).searchParams.get("prosjekt") ?? "";
  if (!microsoftEnabled()) return NextResponse.redirect(new URL("/app/konto", siteUrl()));
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/app/konto/microsoft", maxAge: 600 };
  jar.set("ms_oauth_state", state, opts);
  // Which project the new mailbox belongs to (checked again in the callback).
  jar.set("ms_oauth_project", /^[0-9a-f-]{36}$/i.test(project) ? project : "", opts);
  return NextResponse.redirect(authorizeUrl(`${siteUrl()}/app/konto/microsoft/callback`, state));
}
