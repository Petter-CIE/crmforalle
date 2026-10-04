import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrl, microsoftEnabled } from "@/lib/microsoft";
import { requireWorkspace, siteUrl } from "@/lib/session";

/** Sends the user to Microsoft to connect their Outlook mailbox and calendar. */
export async function GET() {
  await requireWorkspace();
  if (!microsoftEnabled()) return NextResponse.redirect(new URL("/app/konto", siteUrl()));
  const state = randomBytes(24).toString("hex");
  (await cookies()).set("ms_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/app/konto/microsoft", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(`${siteUrl()}/app/konto/microsoft/callback`, state));
}
