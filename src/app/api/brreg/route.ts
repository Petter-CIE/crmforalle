import { NextResponse, type NextRequest } from "next/server";
import { searchBrreg } from "@/lib/brreg";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchBrreg(q.slice(0, 100));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { results: [], error: "Kunne ikke hente data fra Brønnøysundregistrene." },
      { status: 502 },
    );
  }
}
