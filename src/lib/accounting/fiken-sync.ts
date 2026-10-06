import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fikenAll, fikenFresh, type FikenCreds } from "@/lib/fiken";
import { open, seal } from "@/lib/secret-box";
import { importAccounting, iso, type SyncResult } from "./import";

type Db = SupabaseClient<Database>;
const PROVIDER = "fiken";

type FAddress = { streetAddress?: string; streetAddressLine2?: string; postCode?: string; city?: string } | null;
type FPerson = { contactPersonId: number; name?: string; email?: string; phoneNumber?: string };
type FContact = {
  contactId: number;
  name?: string;
  email?: string;
  organizationNumber?: string;
  phoneNumber?: string;
  customer?: boolean;
  inactive?: boolean;
  address?: FAddress;
  contactPerson?: FPerson[];
};
type FInvoice = {
  invoiceId: number;
  invoiceNumber?: number;
  issueDate?: string;
  dueDate?: string;
  net?: number;
  gross?: number;
  currency?: string;
  customer?: { contactId?: number } | null;
  sale?: { outstandingBalance?: number; settled?: boolean } | null;
};

/** Fiken amounts are in øre. */
const kr = (v?: number | null) => (v ?? 0) / 100;

function splitName(full?: string) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? null, lastName: null };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/** Loads the stored Fiken credentials, refreshing (and saving) the access token when needed. */
export async function fikenCredentials(db: Db, workspaceId: string): Promise<FikenCreds> {
  const { data } = await db.from("integrations").select("credentials").eq("workspace_id", workspaceId).eq("provider", PROVIDER).maybeSingle();
  if (!data) throw new Error("not_connected");
  const { creds, changed } = await fikenFresh(JSON.parse(open(data.credentials)) as FikenCreds);
  if (changed) {
    // Fiken may rotate the refresh token: store the new one before anything else.
    const { error } = await db.rpc("integration_update_credentials", {
      p_workspace: workspaceId,
      p_provider: PROVIDER,
      p_credentials: seal(JSON.stringify(creds)),
    });
    if (error) throw new Error("fiken_store_failed");
  }
  return creds;
}

/** Reads customers, their contact persons and invoices from the chosen Fiken company into the CRM. */
export async function syncFiken(db: Db, workspaceId: string, userId: string): Promise<SyncResult> {
  const creds = await fikenCredentials(db, workspaceId);
  if (!creds.slug) throw new Error("fiken_no_company");
  const base = `/companies/${encodeURIComponent(creds.slug)}`;

  const contacts = (await fikenAll<FContact>(creds.access, `${base}/contacts`, { customer: "true", inactive: "false" })).filter(
    (c) => c.customer !== false && !c.inactive && c.name?.trim(),
  );
  const today = new Date();
  const invoices = await fikenAll<FInvoice>(creds.access, `${base}/invoices`, {
    issueDateGe: iso(new Date(today.getTime() - 400 * 86400000)),
  });

  return importAccounting(db, workspaceId, userId, PROVIDER, {
    companies: contacts.map((c) => ({
      id: String(c.contactId),
      name: c.name!,
      orgNumber: c.organizationNumber,
      email: c.email,
      phone: c.phoneNumber,
      address: [c.address?.streetAddress, c.address?.streetAddressLine2].filter(Boolean).join(", ") || null,
      postalCode: c.address?.postCode,
      city: c.address?.city,
    })),
    contacts: contacts.flatMap((c) =>
      (c.contactPerson ?? []).map((p) => ({
        id: `p${p.contactPersonId}`,
        ...splitName(p.name),
        email: p.email,
        phone: p.phoneNumber,
        companyId: String(c.contactId),
      })),
    ),
    invoices: invoices.map((inv) => {
      const gross = kr(inv.gross);
      const outstanding = inv.sale?.outstandingBalance != null ? kr(inv.sale.outstandingBalance) : inv.sale?.settled ? 0 : gross;
      return {
        id: String(inv.invoiceId),
        number: inv.invoiceNumber != null ? String(inv.invoiceNumber) : null,
        date: inv.issueDate ?? null,
        dueDate: inv.dueDate ?? null,
        amount: gross,
        amountExVat: kr(inv.net),
        outstanding,
        currency: inv.currency || "NOK",
        companyId: inv.customer?.contactId != null ? String(inv.customer.contactId) : null,
      };
    }),
  });
}
