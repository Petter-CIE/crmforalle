import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { open } from "@/lib/secret-box";
import { importAccounting, iso, type SyncResult } from "./import";
import { createSession, tripletexGet } from "@/lib/tripletex";

type Db = SupabaseClient<Database>;
type Page<T> = { fullResultSize: number; from: number; count: number; values: T[] };

type TtCustomer = {
  id: number;
  name: string;
  organizationNumber?: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberMobile?: string;
  website?: string;
  isInactive?: boolean;
  postalAddress?: { addressLine1?: string; postalCode?: string; city?: string } | null;
};
type TtContact = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumberMobile?: string;
  phoneNumberWork?: string;
  isInactive?: boolean;
  customer?: { id: number } | null;
};
type TtInvoice = {
  id: number;
  invoiceNumber?: number;
  invoiceDate?: string;
  invoiceDueDate?: string;
  amount?: number;
  amountExcludingVat?: number;
  amountOutstanding?: number;
  isCreditNote?: boolean;
  currency?: { code?: string } | null;
  customer?: { id: number } | null;
};

export type { SyncResult };

const PROVIDER = "tripletex";
const PAGE = 1000;

async function all<T>(session: string, path: string, params: Record<string, string>) {
  const out: T[] = [];
  for (let from = 0; from < 50_000; from += PAGE) {
    const page = await tripletexGet<Page<T>>(session, path, { ...params, from: String(from), count: String(PAGE) });
    out.push(...page.values);
    if (page.values.length < PAGE) break;
  }
  return out;
}

/** Checks an employee token and returns the Tripletex company name. */
export async function verifyTripletex(employeeToken: string) {
  const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
  if (!consumerToken) throw new Error("tripletex_consumer_missing");
  const session = await createSession({ consumerToken, employeeToken });
  const who = await tripletexGet<{ value: { companyId: number; company?: { name?: string } } }>(
    session,
    "/token/session/>whoAmI",
    { fields: "companyId,company(name)" },
  );
  return who.value.company?.name ?? `Tripletex #${who.value.companyId}`;
}

/** Reads customers, contact persons and invoices from Tripletex into the CRM. */
export async function syncTripletex(db: Db, workspaceId: string, userId: string): Promise<SyncResult> {
  const { data: integration } = await db
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", workspaceId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!integration) throw new Error("not_connected");
  const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
  if (!consumerToken) throw new Error("tripletex_consumer_missing");
  const session = await createSession({ consumerToken, employeeToken: open(integration.credentials) });

  const customers = await all<TtCustomer>(session, "/customer", {
    isInactive: "false",
    fields: "id,name,organizationNumber,email,phoneNumber,phoneNumberMobile,website,postalAddress(addressLine1,postalCode,city)",
  });
  const contacts = await all<TtContact>(session, "/contact", {
    fields: "id,firstName,lastName,email,phoneNumberMobile,phoneNumberWork,isInactive,customer(id)",
  });
  const today = new Date();
  const invoices = await all<TtInvoice>(session, "/invoice", {
    invoiceDateFrom: iso(new Date(today.getTime() - 400 * 86400000)),
    invoiceDateTo: iso(new Date(today.getTime() + 86400000)),
    fields: "id,invoiceNumber,invoiceDate,invoiceDueDate,amount,amountExcludingVat,amountOutstanding,isCreditNote,currency(code),customer(id)",
  });

  return importAccounting(db, workspaceId, userId, PROVIDER, {
    companies: customers.map((c) => ({
      id: String(c.id),
      name: c.name,
      orgNumber: c.organizationNumber,
      email: c.email,
      phone: c.phoneNumber || c.phoneNumberMobile,
      website: c.website,
      address: c.postalAddress?.addressLine1,
      postalCode: c.postalAddress?.postalCode,
      city: c.postalAddress?.city,
    })),
    contacts: contacts
      .filter((c) => !c.isInactive)
      .map((c) => ({
        id: String(c.id),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phoneNumberMobile || c.phoneNumberWork,
        companyId: c.customer ? String(c.customer.id) : null,
      })),
    invoices: invoices.map((inv) => ({
      id: String(inv.id),
      number: inv.invoiceNumber != null ? String(inv.invoiceNumber) : null,
      date: inv.invoiceDate ?? null,
      dueDate: inv.invoiceDueDate ?? null,
      amount: inv.amount ?? 0,
      amountExVat: inv.amountExcludingVat ?? 0,
      outstanding: inv.amountOutstanding ?? 0,
      currency: inv.currency?.code ?? "NOK",
      isCreditNote: !!inv.isCreditNote,
      companyId: inv.customer ? String(inv.customer.id) : null,
    })),
  });
}
