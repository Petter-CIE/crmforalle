import type { NextRequest } from "next/server";
import { contactName, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

const LIMIT = 20;

/** Type-to-search for pickers (company, contact, deal, product) and the global search (all). */
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

  // Possible duplicates while creating a company or contact (warning only).
  if (type === "dup-company" || type === "dup-contact") {
    const sp = req.nextUrl.searchParams;
    const clean = (v: string | null) => (v ?? "").replace(/[,()*"\\%_]/g, " ").trim().slice(0, 120);
    const exclude = sp.get("exclude") ?? "";
    const out: { id: string; label: string; hint: string | null; href: string }[] = [];
    if (type === "dup-company") {
      const org = (sp.get("org") ?? "").replace(/\D/g, "");
      const name = clean(sp.get("name"));
      const base = name.replace(/\s+(as|asa|ans|da|enk|sa|ba)$/i, "").trim();
      const ors = [/^\d{9}$/.test(org) && `org_number.eq.${org}`, base.length >= 3 && `name.ilike.${base}`, base.length >= 5 && `name.ilike.${base} %`].filter(Boolean);
      if (ors.length) {
        const { data } = await supabase.from("companies").select("id, name, org_number, city").eq("workspace_id", ws).or(ors.join(",")).limit(5);
        for (const c of data ?? []) if (c.id !== exclude) out.push({ id: c.id, label: c.name, hint: [c.org_number, c.city].filter(Boolean).join(" · ") || null, href: `/app/bedrifter/${c.id}` });
      }
    } else {
      const email = clean(sp.get("email")).toLowerCase();
      const digits = (sp.get("phone") ?? "").replace(/\D/g, "").slice(-8);
      const first = clean(sp.get("first"));
      const last = clean(sp.get("last"));
      const ors = [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && `email.ilike.${email}`,
        digits.length === 8 && `phone.ilike.%${digits.split("").join("%")}`,
        first.length >= 2 && last.length >= 2 && `and(first_name.ilike.${first},last_name.ilike.${last})`,
      ].filter(Boolean);
      if (ors.length) {
        const { data } = await supabase.from("contacts").select("id, first_name, last_name, email, phone, companies(name)").eq("workspace_id", ws).or(ors.join(",")).limit(5);
        for (const c of data ?? [])
          if (c.id !== exclude) out.push({ id: c.id, label: contactName(c), hint: [c.companies?.name, c.email ?? c.phone].filter(Boolean).join(" · ") || null, href: `/app/kontakter/${c.id}` });
      }
    }
    return Response.json(out);
  }

  if (type === "all") {
    if (!q) return Response.json([]);
    const n = 5;
    const words = q.split(/\s+/).filter(Boolean);
    const digits = q.replace(/\s/g, "");
    let contacts = supabase.from("contacts").select("id, first_name, last_name, email, phone, companies(name)").eq("workspace_id", ws).limit(n);
    contacts =
      words.length > 1
        ? contacts.ilike("first_name", `%${words[0]}%`).ilike("last_name", `%${words.slice(1).join(" ")}%`)
        : contacts.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}${/^\+?\d{3,}$/.test(digits) ? `,phone.ilike.%${digits}%` : ""}`);
    const [companies, contactRows, deals, quotes, tasks] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, city, org_number")
        .eq("workspace_id", ws)
        .or(/^\d{3,9}$/.test(digits) ? `org_number.like.${digits}%` : `name.ilike.${like},email.ilike.${like}`)
        .order("name")
        .limit(n),
      contacts,
      supabase.from("deals").select("id, title, value, companies(name)").eq("workspace_id", ws).ilike("title", like).order("updated_at", { ascending: false }).limit(n),
      supabase
        .from("quotes")
        .select("id, number, title, companies(name)")
        .eq("workspace_id", ws)
        .or(/^\d{1,6}$/.test(digits) ? `number.eq.${digits},title.ilike.${like}` : `title.ilike.${like}`)
        .order("number", { ascending: false })
        .limit(n),
      supabase.from("tasks").select("id, title, done_at").eq("workspace_id", ws).ilike("title", like).order("done_at", { nullsFirst: true }).order("due_at").limit(n),
    ]);
    const out = [
      ...(companies.data ?? []).map((c) => ({ group: "company", id: c.id, label: c.name, hint: [c.org_number, c.city].filter(Boolean).join(" · ") || null, href: `/app/bedrifter/${c.id}` })),
      ...(contactRows.data ?? []).map((c) => ({ group: "contact", id: c.id, label: contactName(c), hint: [c.companies?.name, c.email ?? c.phone].filter(Boolean).join(" · ") || null, href: `/app/kontakter/${c.id}` })),
      ...(deals.data ?? []).map((d) => ({ group: "deal", id: d.id, label: d.title, hint: [d.companies?.name, formatMoney(Number(d.value), dateLocale)].filter(Boolean).join(" · "), href: `/app/salg/${d.id}` })),
      ...(quotes.data ?? []).map((x) => ({ group: "quote", id: x.id, label: `#${x.number} ${x.title}`, hint: x.companies?.name ?? null, href: `/app/tilbud/${x.id}` })),
      ...(tasks.data ?? []).map((x) => ({ group: "task", id: x.id, label: x.title, hint: null, done: !!x.done_at, href: `/app/oppgaver/${x.id}` })),
    ];
    return Response.json(out);
  }

  return Response.json([], { status: 400 });
}
