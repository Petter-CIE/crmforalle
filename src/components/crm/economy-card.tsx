import { Card } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

function dates() {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);
  return { today: now.toISOString().slice(0, 10), yearAgo: yearAgo.toISOString().slice(0, 10) };
}

/** Invoices from the accounting system for one company. Renders nothing when no integration is connected. */
export async function EconomyCard({ companyId }: { companyId: string }) {
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const a = t.accounting;
  const [{ data: integration }, { data: invoices }] = await Promise.all([
    supabase.from("integrations").select("last_sync_at").eq("workspace_id", workspace.id).eq("provider", "tripletex").maybeSingle(),
    supabase
      .from("external_invoices")
      .select("external_id, invoice_number, invoice_date, due_date, amount, amount_ex_vat, outstanding, currency, is_credit_note")
      .eq("workspace_id", workspace.id)
      .eq("company_id", companyId)
      .order("invoice_date", { ascending: false })
      .limit(500),
  ]);
  if (!integration && !invoices?.length) return null;

  const list = invoices ?? [];
  const { today, yearAgo } = dates();
  const open = list.filter((i) => Number(i.outstanding) > 0);
  const overdue = open.filter((i) => i.due_date && i.due_date < today);
  const sum = (rows: typeof list, f: (r: (typeof list)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const revenue = sum(
    list.filter((i) => i.invoice_date && i.invoice_date >= yearAgo),
    (i) => Number(i.amount_ex_vat),
  );
  const last = list[0];

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{a.economy}</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted">{a.noInvoices}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">{a.open}</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(sum(open, (i) => Number(i.outstanding)), dateLocale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{a.overdue}</dt>
              <dd className={`font-semibold tabular-nums ${overdue.length ? "text-danger" : ""}`}>
                {formatMoney(sum(overdue, (i) => Number(i.outstanding)), dateLocale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{a.revenue12}</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(revenue, dateLocale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{a.lastInvoice}</dt>
              <dd className="font-semibold">{formatDate(last?.invoice_date, dateLocale)}</dd>
            </div>
          </dl>
          {open.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-medium text-muted">{a.openInvoices}</h3>
              <ul className="divide-y divide-border text-sm">
                {open.slice(0, 10).map((i) => {
                  const late = !!i.due_date && i.due_date < today;
                  return (
                    <li key={i.external_id} className="flex items-center justify-between gap-2 py-1.5">
                      <span>
                        {a.invoiceNo} {i.invoice_number}
                        <span className={`ml-1 text-xs ${late ? "text-danger" : "text-muted"}`}>
                          · {a.due} {formatDate(i.due_date, dateLocale)}
                        </span>
                      </span>
                      <span className="tabular-nums">{formatMoney(Number(i.outstanding), dateLocale)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
      {integration?.last_sync_at && (
        <p className="mt-3 text-xs text-muted">{a.fromProvider.replace("{when}", formatDateTime(integration.last_sync_at, dateLocale))}</p>
      )}
    </Card>
  );
}
