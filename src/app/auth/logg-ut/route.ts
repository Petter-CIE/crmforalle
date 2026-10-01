import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/logg-inn", request.nextUrl.origin), { status: 303 });
  response.cookies.delete("cfa_ws");
  return response;
}
