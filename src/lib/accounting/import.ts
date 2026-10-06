import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Shared import of an accounting system's customers, contact persons and invoices into the CRM.
// Each provider (Tripletex, Fiken, …) only fetches its data and maps it to these shapes.

type Db = SupabaseClient<Database>;

export type ExtCompany = {
  id: string;
  name: string;
  orgNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
};
export type ExtContact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
};
export type ExtInvoice = {
  id: string;
  number?: string | null;
  date?: string | null;
  dueDate?: string | null;
  amount: number;
  amountExVat: number;
  outstanding: number;
  currency?: string | null;
  isCreditNote?: boolean;
  companyId?: string | null;
};

export type SyncResult = {
  companiesCreated: number;
  companiesLinked: number;
  contactsCreated: number;
  invoices: number;
  tasksCreated: number;
  skippedLimit: number;
};

export const iso = (d: Date) => d.toISOString().slice(0, 10);
const orgNo = (v?: string | null) => {
  const d = (v ?? "").replace(/\D/g, "");
  return /^\d{9}$/.test(d) ? d : null;
};
const clean = (v: string | undefined | null, max: number) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const key = (s: string) => s.toLocaleLowerCase("nb").replace(/\s+/g, " ").trim();

/**
 * Files the provider's data in the CRM: links or creates companies and contacts, stores invoices
 * and opens a follow-up task for newly overdue ones. Runs with the signed-in member's session,
 * so row-level security applies throughout.
 */
export async function importAccounting(
  db: Db,
  workspaceId: string,
  userId: string,
  provider: string,
  data: { companies: ExtCompany[]; contacts: ExtContact[]; invoices: ExtInvoice[] },
): Promise<SyncResult> {
  const PROVIDER = provider;
  const result: SyncResult = { companiesCreated: 0, companiesLinked: 0, contactsCreated: 0, invoices: 0, tasksCreated: 0, skippedLimit: 0 };
  const customers = data.companies.filter((c) => c.name?.trim());
  const [{ data: companies }, { data: links }] = await Promise.all([
    db.from("companies").select("id, name, org_number").eq("workspace_id", workspaceId).limit(50_000),
    db.from("integration_links").select("entity, external_id, local_id").eq("workspace_id", workspaceId).eq("provider", PROVIDER),
  ]);
  const companyIds = new Set((companies ?? []).map((c) => c.id));
  const byOrg = new Map((companies ?? []).filter((c) => c.org_number).map((c) => [c.org_number!, c.id]));
  const byName = new Map((companies ?? []).map((c) => [key(c.name), c.id]));
  const companyLink = new Map<string, string>();
  const contactLink = new Map<string, string>();
  for (const l of links ?? []) {
    if (l.entity === "company" && companyIds.has(l.local_id)) companyLink.set(l.external_id, l.local_id);
    if (l.entity === "contact") contactLink.set(l.external_id, l.local_id);
  }

  const newLinks: { workspace_id: string; provider: string; entity: string; external_id: string; local_id: string }[] = [];
  const toCreate: ExtCompany[] = [];
  for (const c of customers) {
    const ext = c.id;
    if (companyLink.has(ext)) continue;
    const org = orgNo(c.orgNumber);
    const match = (org && byOrg.get(org)) || byName.get(key(c.name));
    if (match) {
      companyLink.set(ext, match);
      newLinks.push({ workspace_id: workspaceId, provider: PROVIDER, entity: "company", external_id: ext, local_id: match });
      result.companiesLinked++;
    } else toCreate.push(c);
  }

  // create missing companies in small batches so the contact limit stops cleanly
  for (let i = 0; i < toCreate.length; i += 100) {
    const batch = toCreate.slice(i, i + 100);
    const { data: created, error } = await db
      .from("companies")
      .insert(
        batch.map((c) => ({
          workspace_id: workspaceId,
          name: c.name.trim().slice(0, 200),
          org_number: orgNo(c.orgNumber),
          email: clean(c.email, 200),
          phone: clean(c.phone, 50),
          website: clean(c.website, 200),
          address: clean(c.address, 300),
          postal_code: clean(c.postalCode, 20),
          city: clean(c.city, 100),
          owner_id: userId,
          created_by: userId,
        })),
      )
      .select("id");
    if (error) {
      if (error.message?.includes("contact_limit_reached")) {
        result.skippedLimit += toCreate.length - i;
        break;
      }
      throw new Error(`companies_${error.code ?? "insert"}`);
    }
    (created ?? []).forEach((row, j) => {
      const ext = batch[j].id;
      companyLink.set(ext, row.id);
      newLinks.push({ workspace_id: workspaceId, provider: PROVIDER, entity: "company", external_id: ext, local_id: row.id });
    });
    result.companiesCreated += created?.length ?? 0;
  }

  // --- contact persons -> contacts -------------------------------------------------------
  const ttContacts = data.contacts.filter((c) => c.firstName?.trim() || c.lastName?.trim());
  const emails = [...new Set(ttContacts.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => !!e))];
  const existingEmail = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await db.from("contacts").select("id, email").eq("workspace_id", workspaceId).in("email", emails.slice(i, i + 200));
    for (const c of data ?? []) if (c.email) existingEmail.set(c.email.toLowerCase(), c.id);
  }
  const contactsToCreate: ExtContact[] = [];
  for (const c of ttContacts) {
    const ext = c.id;
    if (contactLink.has(ext)) continue;
    const match = c.email ? existingEmail.get(c.email.trim().toLowerCase()) : undefined;
    if (match) {
      contactLink.set(ext, match);
      newLinks.push({ workspace_id: workspaceId, provider: PROVIDER, entity: "contact", external_id: ext, local_id: match });
    } else contactsToCreate.push(c);
  }
  if (result.skippedLimit === 0) {
    for (let i = 0; i < contactsToCreate.length; i += 100) {
      const batch = contactsToCreate.slice(i, i + 100);
      const { data: created, error } = await db
        .from("contacts")
        .insert(
          batch.map((c) => ({
            workspace_id: workspaceId,
            first_name: (c.firstName?.trim() || c.lastName!.trim()).slice(0, 100),
            last_name: c.firstName?.trim() ? clean(c.lastName, 100) : null,
            email: clean(c.email?.toLowerCase(), 200),
            phone: clean(c.phone, 50),
            company_id: c.companyId ? (companyLink.get(c.companyId) ?? null) : null,
            owner_id: userId,
            created_by: userId,
          })),
        )
        .select("id");
      if (error) {
        if (error.message?.includes("contact_limit_reached")) {
          result.skippedLimit += contactsToCreate.length - i;
          break;
        }
        throw new Error(`contacts_${error.code ?? "insert"}`);
      }
      (created ?? []).forEach((row, j) => {
        newLinks.push({ workspace_id: workspaceId, provider: PROVIDER, entity: "contact", external_id: batch[j].id, local_id: row.id });
      });
      result.contactsCreated += created?.length ?? 0;
    }
  } else result.skippedLimit += contactsToCreate.length;

  for (let i = 0; i < newLinks.length; i += 500) {
    await db.from("integration_links").upsert(newLinks.slice(i, i + 500), { onConflict: "workspace_id,provider,entity,external_id" });
  }

  // --- invoices (last ~13 months) ---------------------------------------------------------
  const today = new Date();
  const invoices = data.invoices;
  const rows = invoices.map((inv) => ({
    workspace_id: workspaceId,
    provider: PROVIDER,
    external_id: inv.id,
    company_id: inv.companyId ? (companyLink.get(inv.companyId) ?? null) : null,
    invoice_number: inv.number ?? null,
    invoice_date: inv.date ?? null,
    due_date: inv.dueDate ?? null,
    amount: inv.amount,
    amount_ex_vat: inv.amountExVat,
    outstanding: inv.outstanding,
    currency: inv.currency || "NOK",
    is_credit_note: !!inv.isCreditNote,
    synced_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("external_invoices")
      .upsert(rows.slice(i, i + 500), { onConflict: "workspace_id,provider,external_id" });
    if (error) throw new Error(`invoices_${error.code ?? "upsert"}`);
  }
  result.invoices = rows.length;

  // --- a follow-up task for newly overdue invoices (due within the last 30 days) ---------
  const todayIso = iso(today);
  const { data: overdue } = await db
    .from("external_invoices")
    .select("external_id, invoice_number, outstanding, currency, due_date, company_id, companies(name, owner_id)")
    .eq("workspace_id", workspaceId)
    .eq("provider", PROVIDER)
    .is("overdue_task_id", null)
    .not("company_id", "is", null)
    .gt("outstanding", 0)
    .lt("due_date", todayIso)
    .gte("due_date", iso(new Date(today.getTime() - 30 * 86400000)))
    .limit(200);
  for (const inv of overdue ?? []) {
    const amount = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(Number(inv.outstanding));
    const { data: task } = await db
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title: `Følg opp forfalt faktura ${inv.invoice_number ?? ""} – ${inv.companies?.name ?? ""} (${amount} ${inv.currency})`.slice(0, 300),
        due_at: new Date(`${todayIso}T12:00:00Z`).toISOString(),
        assignee_id: inv.companies?.owner_id ?? userId,
        company_id: inv.company_id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (task) {
      await db
        .from("external_invoices")
        .update({ overdue_task_id: task.id })
        .eq("workspace_id", workspaceId)
        .eq("provider", PROVIDER)
        .eq("external_id", inv.external_id);
      result.tasksCreated++;
    }
  }

  return result;
}
