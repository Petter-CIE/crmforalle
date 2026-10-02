"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";

export type ImportRow = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  org_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  notes?: string;
};

export type ImportResult = {
  contacts: number;
  companies: number;
  duplicates: number;
  invalid: number;
  overLimit: number;
  error?: boolean;
};

const MAX_CHUNK = 250;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : typeof v === "number" ? String(v) : "";
  return s ? s.slice(0, max) : null;
};
const orgNo = (v: unknown) => {
  const d = (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(/\D/g, "");
  return /^\d{9}$/.test(d) ? d : null;
};
const key = (s: string) => s.toLocaleLowerCase("nb").replace(/\s+/g, " ").trim();

/**
 * Imports one chunk of rows. The browser sends the file in chunks so large files show progress
 * and stay below the request size limit. Companies are matched on org.nr. or name; contacts whose
 * e-mail already exists are skipped.
 */
export async function importChunk(input: {
  rows: ImportRow[];
  createCompanies: boolean;
  projectId: string | null;
}): Promise<ImportResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const result: ImportResult = { contacts: 0, companies: 0, duplicates: 0, invalid: 0, overLimit: 0 };
  if (!Array.isArray(input.rows) || input.rows.length > MAX_CHUNK) return { ...result, error: true };
  const projectId = input.projectId && UUID.test(input.projectId) ? input.projectId : null;

  // Normalise rows
  const rows = input.rows.map((r) => {
    const email = clean(r.email, 200)?.toLowerCase() ?? null;
    return {
      first_name: clean(r.first_name, 100),
      last_name: clean(r.last_name, 100),
      email: email && EMAIL.test(email) ? email : null,
      phone: clean(r.phone, 50),
      title: clean(r.title, 100),
      company: clean(r.company, 200),
      org_number: orgNo(r.org_number),
      address: clean(r.address, 300),
      postal_code: clean(r.postal_code, 20),
      city: clean(r.city, 100),
      notes: clean(r.notes, 5000),
    };
  });

  // How many records may still be created on this plan?
  const [{ count: companyCount }, { count: contactCount }] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
  ]);
  const { data: ws } = await supabase.from("workspaces").select("contact_limit").eq("id", workspace.id).single();
  let capacity = Math.max(0, (ws?.contact_limit ?? 0) - (companyCount ?? 0) - (contactCount ?? 0));

  // --- companies --------------------------------------------------------------
  const companyByOrg = new Map<string, string>();
  const companyByName = new Map<string, string>();
  const wantedOrgs = [...new Set(rows.map((r) => r.org_number).filter((v): v is string => !!v))];
  const wantedNames = [...new Set(rows.map((r) => r.company).filter((v): v is string => !!v))];
  if (wantedOrgs.length || wantedNames.length) {
    const [{ data: byOrg }, { data: byName }] = await Promise.all([
      wantedOrgs.length
        ? supabase.from("companies").select("id, name, org_number").eq("workspace_id", workspace.id).in("org_number", wantedOrgs)
        : Promise.resolve({ data: [] as { id: string; name: string; org_number: string | null }[] }),
      wantedNames.length
        ? supabase.from("companies").select("id, name, org_number").eq("workspace_id", workspace.id).in("name", wantedNames)
        : Promise.resolve({ data: [] as { id: string; name: string; org_number: string | null }[] }),
    ]);
    for (const c of [...(byOrg ?? []), ...(byName ?? [])]) {
      if (c.org_number) companyByOrg.set(c.org_number, c.id);
      companyByName.set(key(c.name), c.id);
    }
  }
  const findCompany = (r: (typeof rows)[number]) =>
    (r.org_number && companyByOrg.get(r.org_number)) || (r.company && companyByName.get(key(r.company))) || null;

  if (input.createCompanies) {
    // one new company per distinct org.nr./name that doesn't exist yet
    const toCreate = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (!r.company || findCompany(r)) continue;
      const k = r.org_number ?? `name:${key(r.company)}`;
      if (!toCreate.has(k)) toCreate.set(k, r);
    }
    const list = [...toCreate.values()];
    const allowed = list.slice(0, capacity);
    result.overLimit += list.length - allowed.length;
    if (allowed.length) {
      const hasPerson = (r: (typeof rows)[number]) => !!(r.first_name || r.last_name);
      const { data: created, error } = await supabase
        .from("companies")
        .insert(
          allowed.map((r) => ({
            workspace_id: workspace.id,
            name: r.company!,
            org_number: r.org_number,
            // company-only rows carry the company's address; on person rows it belongs to the company too
            address: r.address,
            postal_code: r.postal_code,
            city: r.city,
            phone: hasPerson(r) ? null : r.phone,
            email: hasPerson(r) ? null : r.email,
            notes: hasPerson(r) ? null : r.notes,
            owner_id: user.id,
            created_by: user.id,
          })),
        )
        .select("id, name, org_number");
      if (error) return { ...result, error: true };
      for (const c of created ?? []) {
        if (c.org_number) companyByOrg.set(c.org_number, c.id);
        companyByName.set(key(c.name), c.id);
      }
      result.companies += created?.length ?? 0;
      capacity -= created?.length ?? 0;
    }
  }

  // --- contacts ----------------------------------------------------------------
  const people = rows.filter((r) => r.first_name || r.last_name);
  result.invalid += rows.filter((r) => !r.first_name && !r.last_name && !r.company).length;

  const emails = [...new Set(people.map((p) => p.email).filter((e): e is string => !!e))];
  const existing = new Set<string>();
  if (emails.length) {
    const { data } = await supabase.from("contacts").select("email").eq("workspace_id", workspace.id).in("email", emails);
    for (const c of data ?? []) if (c.email) existing.add(c.email.toLowerCase());
  }
  const fresh: typeof people = [];
  for (const p of people) {
    if (p.email && existing.has(p.email)) {
      result.duplicates++;
      continue;
    }
    if (p.email) existing.add(p.email); // also skip repeats inside the file
    fresh.push(p);
  }
  const allowedPeople = fresh.slice(0, capacity);
  result.overLimit += fresh.length - allowedPeople.length;

  if (allowedPeople.length) {
    const { data: created, error } = await supabase
      .from("contacts")
      .insert(
        allowedPeople.map((p) => {
          const companyId = findCompany(p);
          return {
            workspace_id: workspace.id,
            // a contact needs a first name; use the last name when only that is given
            first_name: p.first_name ?? p.last_name!,
            last_name: p.first_name ? p.last_name : null,
            email: p.email,
            phone: p.phone,
            title: p.title,
            company_id: companyId,
            // without a company, the address belongs to the person (private customer)
            address: companyId ? null : p.address,
            postal_code: companyId ? null : p.postal_code,
            city: companyId ? null : p.city,
            notes: p.notes,
            owner_id: user.id,
            created_by: user.id,
          };
        }),
      )
      .select("id");
    if (error) return { ...result, error: true };
    result.contacts += created?.length ?? 0;
    if (projectId && created?.length) {
      await supabase
        .from("project_contacts")
        .upsert(
          created.map((c) => ({ workspace_id: workspace.id, project_id: projectId, contact_id: c.id })),
          { ignoreDuplicates: true },
        );
    }
  }

  revalidatePath("/app/kontakter");
  revalidatePath("/app/bedrifter");
  if (projectId) revalidatePath(`/app/prosjekter/${projectId}`);
  return result;
}
