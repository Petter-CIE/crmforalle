import Link from "next/link";
import { Card, Input } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { monthlyPrice } from "@/lib/pricing";
import { nowMs } from "@/lib/time";
import { adminStatus } from "./guard";

const FILTERS = ["all", "paying", "trial", "expiring", "expired", "free", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await adminStatus();
  const { t, dateLocale } = await getI18n();
  const a = t.admin;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const filter: Filter = FILTERS.includes(sp.vis as Filter) ? (sp.vis as Filter) : "all";

  const { data, error } = await supabase.rpc("admin_workspaces");
  if (error) throw new Error("admin_workspaces failed");
  const rows = data ?? [];
  const now = nowMs();
  const today = new Date(now).toISOString().slice(0, 10);
  const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - now) / 86_400_000);

  const status = (w: (typeof rows)[number]): Exclude<Filter, "all" | "trial"> | "trial" => {
    if (w.suspended_at) return "suspended";
    if (w.plan === "free") return "free";
    if (w.plan === "start" || w.plan === "bedrift") return "paying";
    const left = daysLeft(w.trial_ends_at);
    if (left <= 0) return "expired";
    if (left <= 7) return "expiring";
    return "trial";
  };
  const matches = (w: (typeof rows)[number], f: Filter) => {
    const s = status(w);
    if (f === "all") return true;
    if (f === "trial") return s === "trial" || s === "expiring";
    return s === f;
  };

  const counts = Object.fromEntries(FILTERS.map((f) => [f, rows.filter((w) => matches(w, f)).length])) as Record<Filter, number>;
  const mrr = rows.reduce((sum, w) => sum + monthlyPrice(w, today), 0);
  const users = rows.reduce((sum, w) => sum + Number(w.member_count), 0);

  const shown = rows.filter(
    (w) =>
      matches(w, filter) &&
      (!q ||
        w.name.toLowerCase().includes(q) ||
        (w.org_number ?? "").includes(q) ||
        (w.owner_email ?? "").toLowerCase().includes(q)),
  );

  const label: Record<Filter, string> = {
    all: a.all,
    paying: a.paying,
    trial: a.trials,
    expiring: a.expiringSoon,
    expired: a.expired,
    free: a.free,
    suspended: a.suspended,
  };
  const badge = (w: (typeof rows)[number]) => {
    const s = status(w);
    const cls: Record<string, string> = {
      suspended: "bg-red-100 text-red-800",
      free: "bg-sky-100 text-sky-800",
      paying: "bg-brand-soft text-brand",
      expired: "bg-red-100 text-red-800",
      expiring: "bg-amber-100 text-amber-900",
      trial: "bg-zinc-100 text-zinc-700",
    };
    const text =
      s === "suspended"
        ? a.suspended
        : s === "free"
          ? t.common.plans.free
          : s === "paying"
            ? t.common.plans[w.plan]
            : s === "expired"
              ? `${t.common.plans.trial} · ${a.expiredOn}`
              : `${t.common.plans.trial} · ${a.daysLeft(daysLeft(w.trial_ends_at))}`;
    return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls[s]}`}>{text}</span>;
  };
  const href = (f: Filter) => {
    const p = new URLSearchParams();
    if (f !== "all") p.set("vis", f);
    if (q) p.set("q", q);
    return `/admin${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{a.title}</h1>
        <p className="text-sm text-muted">{a.subtitle}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: a.companies, value: rows.length },
          { label: a.users, value: users },
          { label: a.paying, value: counts.paying },
          { label: a.trials, value: counts.trial, sub: counts.expiring ? `${counts.expiring} · ${a.expiringSoon.toLowerCase()}` : undefined },
          { label: a.mrr, value: formatMoney(mrr, dateLocale) },
        ].map((s) => (
          <Card key={s.label} className="!p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            {s.sub && <p className="mt-0.5 text-xs text-amber-800">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href(f)}
              aria-current={filter === f ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${filter === f ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background"}`}
            >
              {label[f]} <span className="text-xs opacity-70">{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin" className="w-full sm:w-72">
          {filter !== "all" && <input type="hidden" name="vis" value={filter} />}
          <Input name="q" type="search" defaultValue={q} placeholder={a.search} aria-label={a.search} className="w-full" />
        </form>
      </div>

      <Card className="overflow-x-auto !p-0">
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-muted">{a.none}</p>
        ) : (
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{a.company}</th>
                <th className="px-4 py-3 font-medium">{a.owner}</th>
                <th className="px-4 py-3 font-medium">{a.status}</th>
                <th className="px-4 py-3 text-right font-medium">{a.members}</th>
                <th className="px-4 py-3 text-right font-medium">{a.contacts}</th>
                <th className="px-4 py-3 text-right font-medium">{a.price}</th>
                <th className="px-4 py-3 font-medium">{a.created}</th>
                <th className="px-4 py-3 font-medium">{a.lastActivity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((w) => (
                <tr key={w.id} className="hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/admin/${w.id}`} className="font-medium hover:text-brand hover:underline">
                      {w.name}
                    </Link>
                    {w.org_number && <span className="block text-xs text-muted">{w.org_number}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{w.owner_name || "–"}</span>
                    <span className="block text-xs text-muted">{w.owner_email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {badge(w)}
                    {w.discount_percent > 0 && (
                      <span className="ml-1 whitespace-nowrap rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        −{w.discount_percent} %
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.member_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.contact_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(monthlyPrice(w, today), dateLocale)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(w.created_at, dateLocale)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {w.last_activity ? formatDate(w.last_activity, dateLocale) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
