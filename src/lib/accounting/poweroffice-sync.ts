import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { open } from "@/lib/secret-box";
import { missingPrivileges, powerOfficeAll, powerOfficeGet, powerOfficeToken, type PowerOfficeClient } from "@/lib/poweroffice";
import { importAccounting, iso, type SyncResult } from "./import";

type Db = SupabaseClient<Database>;
const PROVIDER = "poweroffice";

type PoAddress = { AddressLine1?: string | null; ZipCode?: string | null; City?: string | null } | null;
type PoCustomer = {
  Id: number;
  Name?: string | null;
  LegalName?: string | null;
  FirstName?: string | null;
  LastName?: string | null;
  IsPerson?: boolean;
  IsActive?: boolean;
  IsArchived?: boolean;
  OrganizationNumber?: string | null;
  EmailAddress?: string | null;
  PhoneNumber?: string | null;
  WebsiteUrl?: string | null;
  MailAddress?: PoAddress;
};
type PoContactPerson = {
  Id: number;
  ContactId: number;
  FirstName?: string | null;
  LastName?: string | null;
  EmailAddress?: string | null;
  PhoneNumber?: string | null;
  IsActive?: boolean;
};
type PoInvoice = {
  Id: string;
  InvoiceNo?: number | null;
  VoucherDate?: string | null;
  DueDate?: string | null;
  TotalAmount?: number | null;
  NetAmount?: number | null;
  Balance?: number | null;
  CurrencyCode?: string | null;
  CustomerId?: number | null;
  IsReversed?: boolean;
  VoucherType?: string | null;
};

export type { SyncResult };

/** Checks a client key and returns the PowerOffice client (company) name. */
export async function verifyPowerOffice(clientKey: string) {
  const token = await powerOfficeToken(clientKey);
  const client = await powerOfficeGet<PowerOfficeClient>(token, "/ClientIntegrationInformation");
  const missing = missingPrivileges(client);
  if (missing.length) throw new Error(`poweroffice_privileges:${missing.join(",")}`);
  return client.ClientName || "PowerOffice Go";
}

/** Reads customers, contact persons and invoices from PowerOffice Go into the CRM. */
export async function syncPowerOffice(db: Db, workspaceId: string, userId: string): Promise<SyncResult> {
  const { data: integration } = await db
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", workspaceId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!integration) throw new Error("not_connected");
  const token = await powerOfficeToken(open(integration.credentials));

  const today = new Date();
  const [customers, persons, invoices] = await Promise.all([
    powerOfficeAll<PoCustomer>(token, "/Customers", {
      Fields: "Id,Name,LegalName,FirstName,LastName,IsPerson,IsActive,IsArchived,OrganizationNumber,EmailAddress,PhoneNumber,WebsiteUrl,MailAddress",
    }),
    powerOfficeAll<PoContactPerson>(token, "/ContactPersons", {
      Fields: "Id,ContactId,FirstName,LastName,EmailAddress,PhoneNumber,IsActive",
    }),
    powerOfficeAll<PoInvoice>(token, "/OutgoingInvoices", {
      fromDate: iso(new Date(today.getTime() - 400 * 86400000)),
      toDate: iso(new Date(today.getTime() + 86400000)),
      Fields: "Id,InvoiceNo,VoucherDate,DueDate,TotalAmount,NetAmount,Balance,CurrencyCode,CustomerId,IsReversed,VoucherType",
    }),
  ]);

  // Private customers (IsPerson) are people, not companies, so they are left out of the company list.
  const active = customers.filter((c) => c.IsActive !== false && !c.IsArchived && !c.IsPerson);
  const customerIds = new Set(active.map((c) => c.Id));

  return importAccounting(db, workspaceId, userId, PROVIDER, {
    companies: active.map((c) => ({
      id: String(c.Id),
      name: (c.Name || c.LegalName || "").trim(),
      orgNumber: c.OrganizationNumber,
      email: c.EmailAddress,
      phone: c.PhoneNumber,
      website: c.WebsiteUrl,
      address: c.MailAddress?.AddressLine1,
      postalCode: c.MailAddress?.ZipCode,
      city: c.MailAddress?.City,
    })),
    // Contact persons also exist on suppliers; only those on customers we import are kept.
    contacts: persons
      .filter((p) => p.IsActive !== false && customerIds.has(p.ContactId))
      .map((p) => ({
        id: String(p.Id),
        firstName: p.FirstName,
        lastName: p.LastName,
        email: p.EmailAddress || null,
        phone: p.PhoneNumber,
        companyId: String(p.ContactId),
      })),
    invoices: invoices
      .filter((inv) => !inv.IsReversed)
      .map((inv) => ({
        id: String(inv.Id),
        number: inv.InvoiceNo != null ? String(inv.InvoiceNo) : null,
        date: inv.VoucherDate ? inv.VoucherDate.slice(0, 10) : null,
        dueDate: inv.DueDate ? inv.DueDate.slice(0, 10) : null,
        amount: inv.TotalAmount ?? 0,
        amountExVat: inv.NetAmount ?? 0,
        outstanding: inv.Balance ?? 0,
        currency: inv.CurrencyCode || "NOK",
        isCreditNote: inv.VoucherType === "OutgoingCreditNote",
        companyId: inv.CustomerId != null ? String(inv.CustomerId) : null,
      })),
  });
}
