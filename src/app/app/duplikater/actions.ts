"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import type { Json as DbJson } from "@/lib/database.types";
import { flash } from "@/lib/flash";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Json = Record<string, unknown>;

/** Values from `other` for the fields that are empty in `keep`. */
function fillEmpty<T extends object>(keep: T, other: T, fields: (keyof T)[]) {
  const out: Partial<T> = {};
  for (const f of fields) {
    const k = keep[f];
    if ((k === null || k === undefined || k === "") && other[f] !== null && other[f] !== undefined && other[f] !== "") out[f] = other[f];
  }
  return out;
}
const joinNotes = (a: string | null, b: string | null) => (a && b && a !== b ? `${a}\n\n${b}` : (a ?? b));
const mergeCustom = (a: unknown, b: unknown) => ({ ...((b as Json) ?? {}), ...((a as Json) ?? {}) }) as DbJson;

/**
 * Merges two companies or two contacts: everything linked to `remove` is moved to `keep`,
 * empty fields on `keep` are filled in, then `remove` is deleted. Owners/admins only.
 */
export async function mergeRecords(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const d = t.dupes;
  if (!canManage(workspace.role)) return { error: d.onlyAdmins };
  const type = String(formData.get("type"));
  const keep = String(formData.get("keep") ?? "");
  const a = String(formData.get("a") ?? "");
  const b = String(formData.get("b") ?? "");
  if (!UUID.test(a) || !UUID.test(b) || a === b || (keep !== a && keep !== b)) return { error: d.failed };
  const remove = keep === a ? b : a;
  const ws = workspace.id;
  const fail = (msg?: string) => {
    if (msg) console.error("merge failed", msg);
    return { error: d.failed };
  };

  if (type === "company") {
    const { data: rows } = await supabase.from("companies").select("*").in("id", [keep, remove]).eq("workspace_id", ws);
    const K = rows?.find((r) => r.id === keep);
    const R = rows?.find((r) => r.id === remove);
    if (!K || !R) return fail();
    const patch = {
      ...fillEmpty(K, R, ["org_number", "address", "postal_code", "city", "nace_code", "nace_description", "website", "email", "phone", "owner_id"]),
      notes: joinNotes(K.notes, R.notes),
      custom: mergeCustom(K.custom, R.custom),
    };
    // Org. numbers are unique: free it on the record that goes away first.
    if (patch.org_number) {
      const { error } = await supabase.from("companies").update({ org_number: null }).eq("id", remove).eq("workspace_id", ws);
      if (error) return fail(error.message);
    }
    for (const table of ["contacts", "deals", "tasks", "activities", "quotes", "external_invoices"] as const) {
      const { error } = await supabase.from(table).update({ company_id: keep }).eq("company_id", remove).eq("workspace_id", ws);
      if (error) return fail(`${table}: ${error.message}`);
    }
    const { data: links } = await supabase.from("project_companies").select("project_id").eq("company_id", remove).eq("workspace_id", ws);
    if (links?.length) {
      await supabase
        .from("project_companies")
        .upsert(links.map((l) => ({ workspace_id: ws, project_id: l.project_id, company_id: keep })), { ignoreDuplicates: true });
    }
    await supabase.from("integration_links").update({ local_id: keep }).eq("workspace_id", ws).eq("entity", "company").eq("local_id", remove);
    const { error: upErr } = await supabase.from("companies").update(patch).eq("id", keep).eq("workspace_id", ws);
    if (upErr) return fail(upErr.message);
    const { error: delErr } = await supabase.from("companies").delete().eq("id", remove).eq("workspace_id", ws);
    if (delErr) return fail(delErr.message);
    revalidatePath("/app/bedrifter");
    revalidatePath("/app/duplikater");
    await flash("saved");
    redirect(`/app/bedrifter/${keep}`);
  }

  if (type === "contact") {
    const { data: rows } = await supabase.from("contacts").select("*").in("id", [keep, remove]).eq("workspace_id", ws);
    const K = rows?.find((r) => r.id === keep);
    const R = rows?.find((r) => r.id === remove);
    if (!K || !R) return fail();
    const patch = {
      ...fillEmpty(K, R, ["last_name", "email", "phone", "title", "company_id", "address", "postal_code", "city", "owner_id"]),
      notes: joinNotes(K.notes, R.notes),
      custom: mergeCustom(K.custom, R.custom),
      ...(R.marketing_consent && !K.marketing_consent ? { marketing_consent: true, marketing_consent_at: R.marketing_consent_at } : {}),
    };
    for (const table of ["deals", "tasks", "activities", "quotes"] as const) {
      const { error } = await supabase.from(table).update({ contact_id: keep }).eq("contact_id", remove).eq("workspace_id", ws);
      if (error) return fail(`${table}: ${error.message}`);
    }
    const { data: links } = await supabase.from("project_contacts").select("project_id").eq("contact_id", remove).eq("workspace_id", ws);
    if (links?.length) {
      await supabase
        .from("project_contacts")
        .upsert(links.map((l) => ({ workspace_id: ws, project_id: l.project_id, contact_id: keep })), { ignoreDuplicates: true });
    }
    await supabase.from("integration_links").update({ local_id: keep }).eq("workspace_id", ws).eq("entity", "contact").eq("local_id", remove);
    const { error: upErr } = await supabase.from("contacts").update(patch).eq("id", keep).eq("workspace_id", ws);
    if (upErr) return fail(upErr.message);
    const { error: delErr } = await supabase.from("contacts").delete().eq("id", remove).eq("workspace_id", ws);
    if (delErr) return fail(delErr.message);
    revalidatePath("/app/kontakter");
    revalidatePath("/app/duplikater");
    await flash("saved");
    redirect(`/app/kontakter/${keep}`);
  }
  return fail();
}
