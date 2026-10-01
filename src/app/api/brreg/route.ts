import { NextResponse, type NextRequest } from "next/server";
import { searchBrreg } from "@/lib/brreg";
import { getI18n } from "@/lib/i18n/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchBrreg(q.slice(0, 100));
    return NextResponse.json({ results });
  } catch {
    const { t } = await getI18n();
    return NextResponse.json({ results: [], error: t.brreg.failed }, { status: 502 });
  }
}
