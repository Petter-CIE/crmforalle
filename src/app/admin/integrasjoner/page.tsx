import { Card } from "@/components/ui";
import { SeedButton } from "./seed-button";
import { adminStatus } from "../guard";
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

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nb-NO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(iso)) : "—";

export default async function IntegrationsPage() {
  const { supabase } = await adminStatus();
  const [inbound, { data: links }] = await Promise.all([checkBrevoInbound(), supabase.rpc("admin_integrations")]);
  // The service check needs its own employee token; customers connect with theirs, so it is optional.
  const tt = envAuth() ? await checkTripletex() : null;
  const tripletex = (links ?? []).filter((l) => l.provider === "tripletex");
  const others = (links ?? []).filter((l) => l.provider !== "tripletex");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Integrasjoner</h1>
      <Card>
        <h2 className="mb-1 font-semibold">Regnskapsintegrasjoner</h2>
        <p className="mb-4 text-xs text-muted">Tripletex: {TRIPLETEX_BASE}</p>
        {!process.env.TRIPLETEX_CONSUMER_TOKEN && <p className="mb-3 text-sm text-danger">TRIPLETEX_CONSUMER_TOKEN mangler i Vercel – bedrifter kan ikke koble til Tripletex.</p>}
        {[...tripletex, ...others].length === 0 ? (
          <p className="text-sm text-muted">Ingen bedrifter har koblet til ennå.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {[...tripletex, ...others].map((l) => (
              <li key={`${l.workspace_id}-${l.provider}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{l.workspace_name}</span>
                  <span className="text-muted">
                    {" "}
                    · {l.provider}
                    {l.external_company ? ` · ${l.external_company}` : ""}
                  </span>
                </span>
                {l.last_error ? (
                  <span className="text-danger">Feil: {l.last_error}</span>
                ) : (
                  <span className="text-brand">✓ Sist synkronisert {fmt(l.last_sync_at)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {tt && !tt.ok && <p className="mt-3 text-xs text-muted">Egen testtilgang (TRIPLETEX_EMPLOYEE_TOKEN): {tt.message}</p>}
        {tt?.ok && TRIPLETEX_BASE.includes("api-test") && <SeedButton />}
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
