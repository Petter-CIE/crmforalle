import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { buildReport, isPeriod, PERIODS, type Period, type Report } from "@/lib/reports";
import { canManage, requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.reports.title };
}

function Kpi({ label, value, sub, hint }: { label: string; value: ReactNode; sub?: ReactNode; hint?: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-muted" title={hint}>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted tabular-nums">{sub}</p>}
    </Card>
  );
}

function TrendChart({
  trend,
  dateLocale,
  t,
}: {
  trend: Report["trend"];
  dateLocale: string;
  t: { month: string; count: string; value: string; showTable: string; trendTitle: string };
}) {
  const max = Math.max(...trend.map((m) => m.value), 0);
  const label = (ms: number, long = false) =>
    new Date(ms).toLocaleDateString(dateLocale, { month: "short", ...(long ? { year: "numeric" } : {}), timeZone: "Europe/Oslo" });
  return (
    <>
      <div className="relative">
        <p className="mb-1 text-right text-[11px] text-muted tabular-nums">{max > 0 ? formatMoney(max, dateLocale) : ""}</p>
        <div className="flex h-40 items-end gap-1.5 border-b border-t border-dashed border-border sm:gap-2" role="list" aria-label={t.trendTitle}>
          {trend.map((m, i) => {
            const pct = max > 0 ? (m.value / max) * 100 : 0;
            const current = i === trend.length - 1;
            return (
              <div
                key={m.monthStart}
                role="listitem"
                tabIndex={0}
                aria-label={`${label(m.monthStart, true)}: ${formatMoney(m.value, dateLocale)}, ${m.count}`}
                className="group relative flex h-full flex-1 items-end outline-none"
              >
                <div
                  className={`w-full rounded-t ${current ? "bg-brand" : "bg-brand/60"} group-hover:bg-brand group-focus-visible:bg-brand`}
                  style={{ height: m.value > 0 ? `max(${pct}%, 3px)` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-sm group-hover:block group-focus-visible:block">
                  <span className="font-medium">{label(m.monthStart, true)}</span>
                  <span className="block tabular-nums">{formatMoney(m.value, dateLocale)}</span>
                  <span className="block text-muted tabular-nums">
                    {t.count}: {m.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1.5 sm:gap-2">
          {trend.map((m) => (
            <span key={m.monthStart} className="flex-1 truncate text-center text-[10px] text-muted sm:text-[11px]">
              {label(m.monthStart)}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-brand hover:underline">{t.showTable}</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">{t.month}</th>
              <th className="py-1 text-right font-medium">{t.count}</th>
              <th className="py-1 text-right font-medium">{t.value}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trend.map((m) => (
              <tr key={m.monthStart}>
                <td className="py-1">{label(m.monthStart, true)}</td>
                <td className="py-1 text-right tabular-nums">{m.count}</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(m.value, dateLocale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<"/app/rapporter">) {
  const ctx = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const r = t.reports;
  const sp = await searchParams;
  const period: Period = isPeriod(sp.periode) ? sp.periode : "mnd";
  const personParam = typeof sp.person === "string" ? sp.person : "";

  const report = await buildReport(ctx, period, personParam || null);
  const person = report.ownerId;
  const data = report;
  const { kpi } = data;
  const money = (v: number) => formatMoney(v, dateLocale);
  const pipeMax = Math.max(...data.pipeline.map((p) => p.value), 0);
  const exportHref = `/app/rapporter/eksport?periode=${period}${person ? `&person=${person}` : ""}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
          <p className="text-sm text-muted">{r.intro}</p>
        </div>
        <form action="/app/rapporter" className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-muted">
            {r.period}
            <AutoSubmitSelect name="periode" defaultValue={period} className="!border-border !bg-surface !px-2 !py-1 !text-sm text-foreground">
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {r.periods[p]}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          {report.members.length > 1 && (
            <label className="flex items-center gap-1.5 text-muted">
              {r.person}
              <AutoSubmitSelect name="person" defaultValue={person ?? ""} className="!border-border !bg-surface !px-2 !py-1 !text-sm text-foreground">
                <option value="">{r.everyone}</option>
                {report.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          )}
          <noscript>
            <button type="submit" className="text-brand hover:underline">
              OK
            </button>
          </noscript>
        </form>
      </header>

      {!report.hasDeals && <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">{r.empty}</p>}
      {data.truncated && <p className="text-xs text-muted">{r.truncated}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={r.won} value={money(kpi.wonValue)} sub={r.deals(kpi.wonCount)} />
        <Kpi label={r.winRate} value={kpi.winRate === null ? "–" : `${kpi.winRate} %`} hint={r.winRateHint} sub={r.winRateHint} />
        <Kpi label={r.avgDeal} value={kpi.avgDeal === null ? "–" : money(kpi.avgDeal)} />
        <Kpi label={r.avgCycle} value={kpi.avgCycleDays === null ? "–" : r.days(kpi.avgCycleDays)} />
        <Kpi label={r.newDeals} value={money(kpi.newValue)} sub={r.deals(kpi.newCount)} />
        <Kpi label={r.lost} value={money(kpi.lostValue)} sub={r.deals(kpi.lostCount)} />
        <Kpi label={r.openPipeline} value={money(kpi.openValue)} sub={r.deals(kpi.openCount)} />
        <Kpi label={r.weighted} value={money(kpi.weightedValue)} sub={r.weightedHint} />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{r.trendTitle}</h2>
        <TrendChart trend={data.trend} dateLocale={dateLocale} t={r} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{r.pipelineTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1.5 pr-3 font-medium">{r.stage}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{r.count}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{r.value}</th>
                <th className="hidden w-1/3 py-1.5 pr-3 sm:table-cell" aria-hidden />
                <th className="py-1.5 text-right font-medium" title={r.weightedHint}>
                  {r.weighted}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.pipeline.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3">
                    {p.name} <span className="text-xs text-muted">· {p.probability} %</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(p.value)}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell" aria-hidden>
                    <div className="h-2 rounded-r bg-brand/60" style={{ width: pipeMax > 0 ? `${(p.value / pipeMax) * 100}%` : 0 }} />
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">{money(p.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{r.activityTitle}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {(
              [
                ["call", r.calls],
                ["meeting", r.meetings],
                ["email", r.emails],
                ["note", r.notes],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{l}</dt>
                <dd className="text-lg font-semibold tabular-nums">{data.activityCounts[k]}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{r.lostReasonsTitle}</h2>
          {data.lostReasons.length === 0 ? (
            <p className="text-sm text-muted">{r.noLostReasons}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.lostReasons.map((l) => (
                <li key={l.reason} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 break-words">{l.reason}</span>
                  <span className="tabular-nums text-muted">{l.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {report.team.length > 1 && (
        <Card>
          <h2 className="font-semibold">{r.teamTitle}</h2>
          <p className="mb-3 text-xs text-muted">{r.teamHint}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1.5 pr-3 font-medium">{r.member}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.won}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.newDeals}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.calls}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.meetings}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.notes}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{r.tasksDone}</th>
                  <th className="py-1.5 text-right font-medium">{r.overdue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.team.map((m) => (
                  <tr key={m.id} className={person === m.id ? "bg-brand-soft" : ""}>
                    <td className="py-2 pr-3">{m.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {money(m.wonValue)} <span className="text-xs text-muted">({m.won})</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.newDeals}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.calls}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.meetings}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.notes}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.tasksDone}</td>
                    <td className={`py-2 text-right tabular-nums ${m.overdue ? "font-medium text-danger" : ""}`}>{m.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {canManage(ctx.workspace.role) && report.hasDeals && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={exportHref}
            className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {r.export}
          </a>
          <span className="text-xs text-muted">{r.exportHint}</span>
        </div>
      )}
    </div>
  );
}
