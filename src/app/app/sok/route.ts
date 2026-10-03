import type { NextRequest } from "next/server";
import { contactName, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

const LIMIT = 20;

/** Type-to-search for pickers: companies, contacts, deals and products of the current company. */
export async function GET(req: NextRequest) {
  const { supabase, workspace } = await requireWorkspace();
  const { dateLocale } = await getI18n();
  const type = req.nextUrl.searchParams.get("type");
  // Characters with a meaning in PostgREST filters (and the % wildcard) are dropped.
  const q = (req.nextUrl.searchParams.get("q") ?? "")
    .replace(/[,()*"\\]/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/%/g, " ");
  const like = `%${q}%`;
  const ws = workspace.id;

  if (type === "company") {
    let query = supabase.from("companies").select("id, name, city, org_number").eq("workspace_id", ws).order("name").limit(LIMIT);
    if (q) query = /^\d{3,9}$/.test(q) ? query.like("org_number", `${q}%`) : query.ilike("name", like);
    const { data } = await query;
    return Response.json((data ?? []).map((c) => ({ id: c.id, label: c.name, hint: [c.org_number, c.city].filter(Boolean).join(" · ") || null })));
  }

  if (type === "contact") {
    let query = supabase
      .from("contacts")
      .select("id, first_name, last_name, email, companies(name)")
      .eq("workspace_id", ws)
      .order("first_name")
      .order("last_name")
      .limit(LIMIT);
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      // "Kari Nord" matches first and last name; a single word matches either name or the e-mail.
      if (words.length > 1) query = query.ilike("first_name", `%${words[0]}%`).ilike("last_name", `%${words.slice(1).join(" ")}%`);
      else query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
    }
    const { data } = await query;
    return Response.json(
      (data ?? []).map((c) => ({ id: c.id, label: contactName(c), hint: [c.companies?.name, c.email].filter(Boolean).join(" · ") || null })),
    );
  }

  if (type === "deal") {
    let query = supabase
      .from("deals")
      .select("id, title, value, companies(name)")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (q) query = query.ilike("title", like);
    const { data } = await query;
    return Response.json(
      (data ?? []).map((d) => ({ id: d.id, label: d.title, hint: [d.companies?.name, formatMoney(Number(d.value), dateLocale)].filter(Boolean).join(" · ") })),
    );
  }

  if (type === "product") {
    let query = supabase
      .from("products")
      .select("id, name, sku, description, unit, unit_price, vat_rate")
      .eq("workspace_id", ws)
      .eq("active", true)
      .order("name")
      .limit(LIMIT);
    if (q) query = query.or(`name.ilike.${like},sku.ilike.${like}`);
    const { data } = await query;
    return Response.json(
      (data ?? []).map((p) => ({
        id: p.id,
        label: p.name,
        hint: [p.sku, `${formatMoney(Number(p.unit_price), dateLocale)} / ${p.unit}`].filter(Boolean).join(" · "),
        data: { description: p.description, unit: p.unit, unit_price: Number(p.unit_price), vat_rate: Number(p.vat_rate) },
      })),
    );
  }

  return Response.json([], { status: 400 });
}
