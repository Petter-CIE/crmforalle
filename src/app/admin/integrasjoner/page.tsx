import { Card } from "@/components/ui";
import { SeedButton } from "./seed-button";
import { InboundButton } from "./inbound-button";
import { brevoEnabled, inboundSecret, listInboundWebhooks } from "@/lib/brevo";
import { DOMAIN } from "@/lib/inbound-mail";
import { SITE_URL } from "@/lib/site-url";
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

async function checkBrevoInbound() {
  if (!brevoEnabled()) return { ok: false as const, message: "BREVO_API_KEY mangler i Vercel." };
  try {
    const hooks = await listInboundWebhooks();
    const want = `${SITE_URL}/api/inbound/brevo?key=${inboundSecret()}`;
    const hook = hooks.find((w) => w.domain === DOMAIN);
    return { ok: true as const, registered: !!hook, current: hook?.url === want };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
  }
}

export default async function IntegrationsPage() {
  const [tt, inbound] = await Promise.all([checkTripletex(), checkBrevoInbound()]);
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
      <Card>
        <h2 className="mb-1 font-semibold">E-post til CRM (Brevo)</h2>
        <p className="mb-4 text-xs text-muted">crm-…@{DOMAIN} → Brevo → {SITE_URL}/api/inbound/brevo</p>
        {!inbound.ok ? (
          <p className="text-sm text-danger">Feil: {inbound.message}</p>
        ) : inbound.registered && inbound.current ? (
          <p className="text-sm font-medium text-brand">Webhook registrert ✓</p>
        ) : inbound.registered ? (
          <p className="text-sm text-danger">Webhooken peker til en gammel adresse (f.eks. etter ny API-nøkkel). Registrer den på nytt.</p>
        ) : (
          <p className="text-sm text-muted">Ingen webhook ennå. E-post til CRM-adressene blir ikke levert før den er registrert.</p>
        )}
        {inbound.ok && <InboundButton registered={inbound.registered} />}
      </Card>
    </div>
  );
}
