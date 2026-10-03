import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";

export const CUSTOM_ENTITIES = ["company", "contact", "deal"] as const;
export type CustomEntity = (typeof CUSTOM_ENTITIES)[number];
export const CUSTOM_TYPES = ["text", "number", "date", "select", "checkbox", "url"] as const;
export type CustomType = (typeof CUSTOM_TYPES)[number];
export const MAX_FIELDS_PER_ENTITY = 30;

export type CustomField = { id: string; label: string; type: CustomType; options: string[] };
export type CustomValues = Record<string, string | number | boolean>;

export async function loadCustomFields(supabase: SupabaseClient<Database>, workspaceId: string, entity: CustomEntity) {
  const { data } = await supabase
    .from("custom_fields")
    .select("id, label, type, options")
    .eq("workspace_id", workspaceId)
    .eq("entity", entity)
    .order("position")
    .order("created_at");
  return (data ?? []) as CustomField[];
}

/** Reads the cf_<id> inputs of a form into a clean JSON object. Unknown or empty values are dropped. */
export function parseCustomValues(formData: FormData, fields: CustomField[]): CustomValues {
  const out: CustomValues = {};
  for (const f of fields) {
    const raw = formData.get(`cf_${f.id}`);
    if (f.type === "checkbox") {
      if (raw === "1") out[f.id] = true;
      continue;
    }
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) continue;
    if (f.type === "number") {
      const n = Number(s.replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(n)) out[f.id] = n;
    } else if (f.type === "date") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out[f.id] = s;
    } else if (f.type === "select") {
      if (f.options.includes(s)) out[f.id] = s;
    } else if (f.type === "url") {
      const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      if (url.length <= 500) out[f.id] = url;
    } else {
      out[f.id] = s.slice(0, 1000);
    }
  }
  return out;
}

/** The stored JSON as a plain object (never null). */
export function asCustomValues(v: Json | null | undefined): CustomValues {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as CustomValues) : {};
}

/** Display text for one value, or "" when empty. */
export function formatCustomValue(f: CustomField, v: unknown, dateLocale: string, yes: string) {
  if (v === undefined || v === null || v === "" || v === false) return "";
  if (f.type === "checkbox") return v === true ? yes : "";
  if (f.type === "number" && typeof v === "number") return new Intl.NumberFormat(dateLocale).format(v);
  if (f.type === "date" && typeof v === "string") {
    const d = new Date(`${v}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  }
  return String(v);
}
