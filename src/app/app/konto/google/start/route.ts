import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrl, googleEnabled } from "@/lib/google";
import { requireWorkspace, siteUrl } from "@/lib/session";

/** Sends the user to Google to connect their calendar (free/busy only). */
export async function GET() {
  await requireWorkspace();
  if (!googleEnabled()) return NextResponse.redirect(new URL("/app/konto", siteUrl()));
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/app/konto/google", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(`${siteUrl()}/app/konto/google/callback`, state));
}
