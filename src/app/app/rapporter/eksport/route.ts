import type { NextRequest } from "next/server";
import { contactName, listMembers } from "@/lib/crm";
import { csvResponse, toCsv } from "@/lib/csv";
import { isPeriod, periodRange } from "@/lib/reports";
import { canManage, requireWorkspace } from "@/lib/session";
import { stageName } from "@/lib/stages";

const PAGE = 1000;

/** Deals created or closed in the selected period, as CSV for Excel (owner/admin only). */
export async function GET(req: NextRequest) {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  if (!canManage(workspace.role)) return new Response("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const periode = sp.get("periode");
  const period = isPeriod(periode) ? periode : "mnd";
  const { from, to } = periodRange(period);
  const members = await listMembers(ctx);
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const person = sp.get("person");
  const owner = person && memberName.has(person) ? person : null;

  const header = ["Tittel", "Bedrift", "Kontakt", "Prosjekt", "Ansvarlig", "Fase", "Status", "Verdi", "Opprettet", "Forventet avslutning", "Avsluttet", "Tapsårsak"];
  const rows: unknown[][] = [header];
  for (let start = 0; ; start += PAGE) {
    let q = supabase
      .from("deals")
      .select(
        "title, value, owner_id, created_at, expected_close, closed_at, lost_reason, companies(name), contacts(first_name, last_name), projects(name), pipeline_stages(name, is_won, is_lost)",
      )
      .eq("workspace_id", workspace.id)
      .or(`and(created_at.gte."${from}",created_at.lt."${to}"),and(closed_at.gte."${from}",closed_at.lt."${to}")`);
    if (owner) q = q.eq("owner_id", owner);
    const { data, error } = await q.order("created_at").range(start, start + PAGE - 1);
    if (error) {
      console.error("report export failed", error.message);
      return new Response("Error", { status: 500 });
    }
    for (const d of data ?? []) {
      const stage = d.pipeline_stages;
      rows.push([
        d.title,
        d.companies?.name,
        d.contacts ? contactName(d.contacts) : "",
        d.projects?.name,
        d.owner_id ? memberName.get(d.owner_id) : "",
        stage ? stageName(stage.name, "nb") : "",
        stage?.is_won ? "Vunnet" : stage?.is_lost ? "Tapt" : "Åpen",
        Number(d.value).toFixed(2).replace(".", ","),
        d.created_at.slice(0, 10),
        d.expected_close,
        d.closed_at?.slice(0, 10),
        d.lost_reason,
      ]);
    }
    if (!data || data.length < PAGE) break;
  }
  return csvResponse(toCsv(rows), `salg-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
}
