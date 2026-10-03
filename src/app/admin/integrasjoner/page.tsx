import { Card } from "@/components/ui";
import { SeedButton } from "./seed-button";
import { createSession, envAuth, TRIPLETEX_BASE, tripletexGet } from "@/lib/tripletex";

export const dynamic = "force-dynamic";

type WhoAmI = { value: { employeeId: number; companyId: number; company?: { name?: string } } };
type List = { fullResultSize: number; values: unknown[] };

async function checkTripletex() {
  const auth = envAuth();
  if (!auth) return { ok: false as const, message: "TRIPLETEX_CONSUMER_TOKEN / TRIPLETEX_EMPLOYEE_TOKEN mangler i Vercel." };
  try {
    const session = await createSession(auth);
    const who = await tripletexGet<WhoAmI>(session, "/token/session/>whoAmI", { fields: "employeeId,companyId,company(name)" });
    const [customers, invoices] = await Promise.all([
      tripletexGet<List>(session, "/customer", { count: "1", fields: "id" }),
      tripletexGet<List>(session, "/invoice", { count: "1", fields: "id", invoiceDateFrom: "2000-01-01", invoiceDateTo: "2100-01-01" }),
    ]);
    const result = {
      ok: true as const,
      company: who.value.company?.name ?? `#${who.value.companyId}`,
      companyId: who.value.companyId,
      customers: customers.fullResultSize,
      invoices: invoices.fullResultSize,
    };
    console.log("tripletex check ok", result);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("tripletex check failed", message);
    return { ok: false as const, message };
  }
}

export default async function IntegrationsPage() {
  const tt = await checkTripletex();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Integrasjoner</h1>
      <Card>
        <h2 className="mb-1 font-semibold">Tripletex</h2>
        <p className="mb-4 text-xs text-muted">{TRIPLETEX_BASE}</p>
        {tt.ok ? (
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-sm">
            <dt className="text-muted">Status</dt>
            <dd className="font-medium text-brand">Tilkoblet ✓</dd>
            <dt className="text-muted">Firma</dt>
            <dd>
              {tt.company} (id {tt.companyId})
            </dd>
            <dt className="text-muted">Kunder</dt>
            <dd>{tt.customers}</dd>
            <dt className="text-muted">Fakturaer</dt>
            <dd>{tt.invoices}</dd>
          </dl>
        ) : (
          <p className="text-sm text-danger">Ikke tilkoblet: {tt.message}</p>
        )}
        {tt.ok && TRIPLETEX_BASE.includes("api-test") && <SeedButton />}
      </Card>
    </div>
  );
}
