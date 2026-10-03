import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { canManage, requireWorkspace } from "@/lib/session";

const PAGE = 1000;

/** Exports all companies or contacts of the current company as CSV (owner/admin only). */
export async function GET(req: NextRequest) {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) return new NextResponse("Forbidden", { status: 403 });
  const type = req.nextUrl.searchParams.get("type") === "bedrifter" ? "bedrifter" : "kontakter";
  const date = new Date().toISOString().slice(0, 10);

  if (type === "bedrifter") {
    const header = ["Navn", "Org.nr.", "Adresse", "Postnr.", "Poststed", "Bransje", "Nettside", "E-post", "Telefon", "Notater", "Opprettet"];
    const rows: unknown[][] = [header];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("companies")
        .select("name, org_number, address, postal_code, city, nace_description, website, email, phone, notes, created_at")
        .eq("workspace_id", workspace.id)
        .order("name")
        .range(from, from + PAGE - 1);
      if (error) return new NextResponse("Error", { status: 500 });
      for (const c of data ?? [])
        rows.push([c.name, c.org_number, c.address, c.postal_code, c.city, c.nace_description, c.website, c.email, c.phone, c.notes, c.created_at.slice(0, 10)]);
      if (!data || data.length < PAGE) break;
    }
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bedrifter-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const header = ["Fornavn", "Etternavn", "E-post", "Telefon", "Stilling", "Bedrift", "Adresse", "Postnr.", "Poststed", "Samtykke markedsføring", "Samtykke tidspunkt", "Notater", "Opprettet"];
  const rows: unknown[][] = [header];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, phone, title, address, postal_code, city, marketing_consent, marketing_consent_at, notes, created_at, companies(name)")
      .eq("workspace_id", workspace.id)
      .order("first_name")
      .range(from, from + PAGE - 1);
    if (error) return new NextResponse("Error", { status: 500 });
    for (const k of data ?? [])
      rows.push([
        k.first_name,
        k.last_name,
        k.email,
        k.phone,
        k.title,
        k.companies?.name,
        k.address,
        k.postal_code,
        k.city,
        k.marketing_consent ? "ja" : "nei",
        k.marketing_consent_at,
        k.notes,
        k.created_at.slice(0, 10),
      ]);
    if (!data || data.length < PAGE) break;
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kontakter-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
