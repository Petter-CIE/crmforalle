import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

// GET /sprak?l=en&neste=/app  → stores the language and returns to the page.
export async function GET(request: NextRequest) {
  const l = request.nextUrl.searchParams.get("l");
  const nextRaw = request.nextUrl.searchParams.get("neste") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const response = NextResponse.redirect(new URL(next, request.nextUrl.origin));
  if (isLocale(l)) {
    response.cookies.set(LOCALE_COOKIE, l, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ locale: l }).eq("id", data.user.id);
  }
  return response;
}
