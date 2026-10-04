import { addRoleAsContact } from "@/app/app/crm-actions";
import { Card } from "@/components/ui";
import { brregDetails } from "@/lib/brreg";
import { formatDate, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";

const norm = (s: string) => s.toLocaleLowerCase("nb").replace(/\s+/g, " ").trim();

/** Roles, employees and the latest key figures from the Brønnøysund registers (cached for a day). */
export async function BrregCard({ companyId, orgNumber, contacts }: { companyId: string; orgNumber: string; contacts: { first_name: string; last_name: string | null }[] }) {
  const { t, dateLocale } = await getI18n();
  const b = t.brregInfo;
  const info = await brregDetails(orgNumber);
  const known = new Set(contacts.map((c) => norm(`${c.first_name} ${c.last_name ?? ""}`)));
  const currency = info?.figures?.currency ?? "NOK";
  const money = (n: number | null) =>
    n === null ? "–" : currency === "NOK" ? formatMoney(n, dateLocale) : `${Math.round(n).toLocaleString(dateLocale)} ${currency}`;

  return (
    <Card>
      <h2 className="mb-3 font-semibold">🏛️ {b.title}</h2>
      {!info ? (
        <p className="text-sm text-muted">{b.noData}</p>
      ) : (
        <div className="space-y-4 text-sm">
          {(info.employees !== null || info.founded) && (
            <dl className="grid grid-cols-2 gap-3">
              {info.employees !== null && (
                <div>
                  <dt className="text-xs text-muted">{b.employees}</dt>
                  <dd className="font-medium">{info.employees}</dd>
                </div>
              )}
              {info.founded && (
                <div>
                  <dt className="text-xs text-muted">{b.founded}</dt>
                  <dd className="font-medium">{formatDate(info.founded, dateLocale)}</dd>
                </div>
              )}
            </dl>
          )}

          {info.roles.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{b.roles}</h3>
              <ul className="divide-y divide-border">
                {info.roles.map((r, i) => {
                  const name = `${r.firstName} ${r.lastName}`.trim();
                  const isContact = known.has(norm(name));
                  return (
                    <li key={`${r.code}-${i}`} className="flex items-center gap-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{name}</p>
                        <p className="text-xs text-muted">{r.title}</p>
                      </div>
                      {!r.isCompany &&
                        (isContact ? (
                          <span className="text-xs text-muted">✓ {b.isContact}</span>
                        ) : (
                          <form action={addRoleAsContact}>
                            <input type="hidden" name="company_id" value={companyId} />
                            <input type="hidden" name="first_name" value={r.firstName} />
                            <input type="hidden" name="last_name" value={r.lastName} />
                            <input type="hidden" name="title" value={r.title} />
                            <button type="submit" className="whitespace-nowrap text-xs text-brand hover:underline">
                              {b.addContact}
                            </button>
                          </form>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {info.figures && (
            <div>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{b.figures(info.figures.year)}</h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {(
                  [
                    [b.revenue, info.figures.revenue],
                    [b.operatingResult, info.figures.operatingResult],
                    [b.netResult, info.figures.netResult],
                    [b.equity, info.figures.equity],
                  ] as [string, number | null][]
                ).map(([label, v]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className={`font-medium tabular-nums ${v !== null && v < 0 ? "text-danger" : ""}`}>{money(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="text-xs text-muted">{b.source}</p>
        </div>
      )}
    </Card>
  );
}
