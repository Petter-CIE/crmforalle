"use server";

import { revalidatePath } from "next/cache";
import { createSession, envAuth, TRIPLETEX_BASE, tripletexGet, tripletexSend } from "@/lib/tripletex";
import { adminStatus } from "../guard";

export type SeedState = { ok?: boolean; message?: string };

/** Valid-looking Norwegian numbers (mod 11) so Tripletex accepts them. */
function mod11(digits: number[], weights: number[]) {
  const sum = digits.reduce((s, d, i) => s + d * weights[i], 0);
  const r = 11 - (sum % 11);
  return r === 11 ? 0 : r === 10 ? -1 : r;
}
function fakeOrgNo() {
  for (;;) {
    const d = [9, ...Array.from({ length: 7 }, () => Math.floor(Math.random() * 10))];
    const c = mod11(d, [3, 2, 7, 6, 5, 4, 3, 2]);
    if (c >= 0) return d.join("") + c;
  }
}
function fakeBankAccount() {
  for (;;) {
    const d = [1, 5, 0, 3, ...Array.from({ length: 6 }, () => Math.floor(Math.random() * 10))];
    const c = mod11(d, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]);
    if (c >= 0) return d.join("") + c;
  }
}
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

/** Creates sample customers, a contact person and invoices in the Tripletex TEST environment. */
export async function seedTripletexTestData(): Promise<SeedState> {
  const { isAdmin, hasAal2 } = await adminStatus();
  if (!isAdmin || !hasAal2) return { message: "forbidden" };
  if (!TRIPLETEX_BASE.includes("api-test")) return { message: "Kun mot testmiljøet." };
  const auth = envAuth();
  if (!auth) return { message: "Mangler testnøkler." };
  const steps: string[] = [];
  try {
    const session = await createSession(auth);

    // invoicing needs a bank account on 1920
    const acc = await tripletexGet<{ values: { id: number; version: number; bankAccountNumber?: string }[] }>(session, "/ledger/account", {
      number: "1920",
      fields: "id,version,bankAccountNumber",
    });
    const bank = acc.values[0];
    if (bank && !bank.bankAccountNumber) {
      await tripletexSend(session, "PUT", `/ledger/account/${bank.id}`, { id: bank.id, version: bank.version, bankAccountNumber: fakeBankAccount() });
      steps.push("bankkonto satt");
    }

    const names = ["Fjordbygg Test AS", "Vestland Rør Test AS", "Bergen Regnskap Test AS"];
    const customers: number[] = [];
    for (const name of names) {
      const c = await tripletexSend<{ value: { id: number } }>(session, "POST", "/customer", {
        name,
        organizationNumber: fakeOrgNo(),
        email: `post@${name.split(" ")[0].toLowerCase()}-test.no`,
        isCustomer: true,
        postalAddress: { addressLine1: "Testveien 1", postalCode: "5003", city: "Bergen" },
      });
      customers.push(c.value.id);
    }
    steps.push(`${customers.length} kunder`);

    await tripletexSend(session, "POST", "/contact", {
      firstName: "Kari",
      lastName: "Testesen",
      email: "kari@fjordbygg-test.no",
      customer: { id: customers[0] },
    });
    steps.push("1 kontaktperson");

    const invoices: [number, number, number, number][] = [
      // customer index, invoice date offset, due date offset, amount ex. VAT
      [0, -25, -10, 12000], // overdue
      [0, -3, 11, 4500], // open
      [1, -60, -46, 8000], // older (overdue > 30 days: no task)
      [2, -5, 9, 15000], // open
    ];
    let made = 0;
    for (const [ci, inv, due, amount] of invoices) {
      await tripletexSend(
        session,
        "POST",
        "/invoice",
        {
          invoiceDate: day(inv),
          invoiceDueDate: day(due),
          customer: { id: customers[ci] },
          orders: [
            {
              customer: { id: customers[ci] },
              orderDate: day(inv),
              deliveryDate: day(inv),
              orderLines: [{ description: "Testtjeneste", count: 1, unitPriceExcludingVatCurrency: amount }],
            },
          ],
        },
        { sendToCustomer: "false" },
      );
      made++;
    }
    steps.push(`${made} fakturaer`);
    revalidatePath("/admin/integrasjoner");
    return { ok: true, message: `Opprettet: ${steps.join(", ")}.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tripletex seed failed", msg);
    return { message: `${steps.length ? `Opprettet: ${steps.join(", ")}. ` : ""}Feil: ${msg}` };
  }
}
