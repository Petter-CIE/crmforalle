import "server-only";
import { contactName } from "@/lib/crm";
import type { requireWorkspace } from "@/lib/session";

type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;
export type DupReason = "org" | "name" | "email" | "phone";
export type DupPair = { a: { id: string; label: string; hint: string }; b: { id: string; label: string; hint: string }; reasons: DupReason[] };

const SUFFIX = /\b(as|asa|ans|da|enk|sa|ba|ab|aps|gmbh|ltd|inc)\b\.?/g;
export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/\ba\/s\b/g, "as")
    .replace(SUFFIX, "")
    .replace(/[^a-z0-9æøåäöü]+/g, " ")
    .trim();
const phoneKey = (p: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-8) : null;
};

/** Groups rows by keys and returns each pair that shares at least one key (with all the reasons). */
function pairs<T extends { id: string }>(rows: T[], keys: [DupReason, (r: T) => string | null][]) {
  const found = new Map<string, { a: T; b: T; reasons: Set<DupReason> }>();
  for (const [reason, keyOf] of keys) {
    const groups = new Map<string, T[]>();
    for (const r of rows) {
      const k = keyOf(r);
      if (!k) continue;
      const g = groups.get(k);
      if (g) g.push(r);
      else groups.set(k, [r]);
    }
    for (const g of groups.values()) {
      if (g.length < 2 || g.length > 20) continue; // very large groups are not duplicates (e.g. a shared switchboard number)
      for (let i = 0; i < g.length; i++)
        for (let j = i + 1; j < g.length; j++) {
          const [a, b] = g[i].id < g[j].id ? [g[i], g[j]] : [g[j], g[i]];
          const key = `${a.id}:${b.id}`;
          const p = found.get(key) ?? { a, b, reasons: new Set<DupReason>() };
          p.reasons.add(reason);
          found.set(key, p);
        }
    }
  }
  return [...found.values()];
}

export async function companyDuplicates(ctx: Ctx): Promise<DupPair[]> {
  const { data } = await ctx.supabase
    .from("companies")
    .select("id, name, org_number, city, email, phone, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .limit(20000);
  const rows = data ?? [];
  return pairs(rows, [
    ["org", (r) => (r.org_number && /^\d{9}$/.test(r.org_number) ? r.org_number : null)],
    ["name", (r) => (normName(r.name).length >= 3 ? normName(r.name) : null)],
  ])
    .slice(0, 200)
    .map(({ a, b, reasons }) => ({
      a: { id: a.id, label: a.name, hint: [a.org_number, a.city].filter(Boolean).join(" · ") },
      b: { id: b.id, label: b.name, hint: [b.org_number, b.city].filter(Boolean).join(" · ") },
      reasons: [...reasons],
    }));
}

export async function contactDuplicates(ctx: Ctx): Promise<DupPair[]> {
  const { data } = await ctx.supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, company_id, companies(name)")
    .eq("workspace_id", ctx.workspace.id)
    .limit(20000);
  const rows = data ?? [];
  return pairs(rows, [
    ["email", (r) => r.email?.trim().toLowerCase() || null],
    ["phone", (r) => phoneKey(r.phone)],
    ["name", (r) => (r.last_name ? `${normName(contactName(r))}|${r.company_id ?? ""}` : null)],
  ])
    .slice(0, 200)
    .map(({ a, b, reasons }) => ({
      a: { id: a.id, label: contactName(a), hint: [a.companies?.name, a.email ?? a.phone].filter(Boolean).join(" · ") },
      b: { id: b.id, label: contactName(b), hint: [b.companies?.name, b.email ?? b.phone].filter(Boolean).join(" · ") },
      reasons: [...reasons],
    }));
}
