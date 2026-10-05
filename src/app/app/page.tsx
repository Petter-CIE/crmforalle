import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { TASK_SELECT, TaskRows, type TaskRow } from "@/components/crm/task-list";
import { ACTIVITY_ICON } from "@/components/crm/timeline";
import { InstallApp } from "@/components/install-app";
import { ButtonLink } from "@/components/ui";
import { contactName, formatMoney, involvedFilter, listMembers } from "@/lib/crm";
import { defaultLayout, parseLayout, type WidgetId } from "@/lib/dashboard";
import { getI18n } from "@/lib/i18n/server";
import type { QuoteStatus } from "@/lib/quotes";
import { canManage, requireWorkspace } from "@/lib/session";
import { daysAgoIso, nowMs } from "@/lib/time";
import { StatusBadge } from "./tilbud/status-badge";
import { DashboardGrid } from "./_components/dashboard-grid";
import { stageName } from "@/lib/stages";
import { loadPipelines, orderStages, stageLabel } from "@/lib/pipelines";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.today.title };
}

const DAY = 24 * 60 * 60 * 1000;

/** Year, month (0-11) and hour in Norway, whatever the server's time zone is. */
function osloParts(ms: number) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", year: "numeric", month: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(
    new Date(ms),
  );
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value);
  return { year: get("year"), month: get("month") - 1, hour: get("hour") };
}

/** Midnight in Norway on the given day, as an ISO timestamp. */
function osloMidnight(year: number, month: number, day: number) {
  const utc = Date.UTC(year, month, day);
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Oslo", timeZoneName: "shortOffset" })
    .formatToParts(new Date(utc))
    .find((x) => x.type === "timeZoneName")?.value;
  const hours = Number(name?.match(/GMT([+-]\d+)/)?.[1] ?? 1);
  return new Date(utc - hours * 60 * 60 * 1000).toISOString();
}

export default async function TodayPage() {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t, dateLocale, locale } = await getI18n();
  const d = t.ui.dash;
  const now = nowMs();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const in7 = new Date(endOfToday.getTime() + 7 * DAY);
  const staleBefore = daysAgoIso(14);
  const { year, month, hour } = osloParts(now);
  const monthStart = osloMidnight(year, month, 1);
  const lastMonthStart = osloMidnight(year, month - 1, 1);

  const [{ data: profile }, { count: memberCount }, { count: companyCount }, { data: stagesRaw }, { data: deals }, pipelines] = await Promise.all([
    supabase.from("profiles").select("full_name, dashboard").eq("id", user.id).single(),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("pipeline_stages").select("id, name, position, probability, is_won, is_lost, pipeline_id").eq("workspace_id", workspace.id),
    supabase.from("deals").select("id, title, value, stage_id, updated_at, closed_at, companies(name)").eq("workspace_id", workspace.id).limit(5000),
    loadPipelines(supabase, workspace.id),
  ]);
  const stages = orderStages(stagesRaw ?? [], pipelines);

  const steps = [
    { done: true, label: t.today.stepCreate, href: null },
    { done: (memberCount ?? 0) > 1, label: t.today.stepInvite, href: canManage(workspace.role) ? "/app/team" : null },
    { done: (companyCount ?? 0) > 0, label: t.today.stepCustomers, href: "/app/bedrifter/ny" },
    { done: (deals ?? []).length > 0, label: t.today.stepPipeline, href: "/app/salg/ny" },
  ];
  const allDone = steps.every((s) => s.done);
  const defaults = defaultLayout(!allDone);
  const layout = parseLayout(profile?.dashboard) ?? defaults;
  const on = new Set<WidgetId>(layout.map((x) => x.id));

  const mine = await involvedFilter(ctx, user.id);
  const needTasks = on.has("tasks") || on.has("kpis");
  const [tasksRes, upcomingRes, quotesRes, activityRes, members] = await Promise.all([
    needTasks
      ? supabase
          .from("tasks")
          .select(TASK_SELECT)
          .eq("workspace_id", workspace.id)
          .or(mine)
          .is("done_at", null)
          .lte("due_at", endOfToday.toISOString())
          .order("due_at")
          .limit(50)
      : null,
    on.has("upcoming")
      ? supabase
          .from("tasks")
          .select(TASK_SELECT)
          .eq("workspace_id", workspace.id)
          .or(mine)
          .is("done_at", null)
          .gt("due_at", endOfToday.toISOString())
          .lte("due_at", in7.toISOString())
          .order("due_at")
          .limit(10)
      : null,
    on.has("quotes") || on.has("kpis")
      ? supabase
          .from("quotes")
          .select("id, number, title, status, viewed_at, responded_at, total, updated_at, companies(name)")
          .eq("workspace_id", workspace.id)
          .neq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(50)
      : null,
    on.has("activity")
      ? supabase
          .from("activities")
          .select("id, type, body, occurred_at, profiles(full_name, email), companies(id, name), contacts(id, first_name, last_name), deals(id, title)")
          .eq("workspace_id", workspace.id)
          .order("occurred_at", { ascending: false })
          .limit(8)
      : null,
    on.has("tasks") || on.has("upcoming") ? listMembers(ctx) : undefined,
  ]);

  const stageById = new Map((stages ?? []).map((s) => [s.id, s]));
  const open = (deals ?? []).filter((x) => {
    const s = stageById.get(x.stage_id);
    return s && !s.is_won && !s.is_lost;
  });
  const openTotal = open.reduce((s, x) => s + Number(x.value), 0);
  const stale = open.filter((x) => x.updated_at < staleBefore).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const tasks = (tasksRes?.data ?? []) as TaskRow[];
  const quotes = quotesRes?.data ?? [];
  const waitingQuotes = quotes.filter((q) => q.status === "sent");
  const money = (v: number) => formatMoney(v, dateLocale);

  const content: Partial<Record<WidgetId, ReactNode>> = {};
  const links: Partial<Record<WidgetId, string>> = { tasks: "/app/oppgaver", upcoming: "/app/oppgaver", quotes: "/app/tilbud", pipeline: "/app/salg", won: "/app/rapporter" };

  if (on.has("kpis")) {
    const kpi = (label: string, value: ReactNode, href: string, sub?: ReactNode, warn = false) => (
      <Link href={href} className="block rounded-lg border border-border p-4 transition-colors hover:border-brand">
        <p className="text-xs text-muted">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-amber-600" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </Link>
    );
    content.kpis = (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi(d.kpiTasks, tasks.length, "/app/oppgaver", undefined, tasks.some((x) => x.due_at && new Date(x.due_at).getTime() < now))}
        {kpi(d.kpiOpen, money(openTotal), "/app/salg", open.length)}
        {kpi(d.kpiStale, stale.length, "/app/salg", undefined, stale.length > 0)}
        {kpi(d.kpiQuotes, waitingQuotes.length, "/app/tilbud", waitingQuotes.length ? money(waitingQuotes.reduce((s, q) => s + Number(q.total), 0)) : undefined)}
      </div>
    );
  }

  if (on.has("tasks")) content.tasks = <TaskRows tasks={tasks.slice(0, 8)} path="/app" showLinks members={members} />;
  if (on.has("upcoming")) content.upcoming = <TaskRows tasks={(upcomingRes?.data ?? []) as TaskRow[]} path="/app" showLinks members={members} />;

  if (on.has("won")) {
    const wonIn = (from: string, to?: string) =>
      (deals ?? []).filter((x) => stageById.get(x.stage_id)?.is_won && x.closed_at && x.closed_at >= from && (!to || x.closed_at < to));
    const thisMonth = wonIn(monthStart);
    const lastMonth = wonIn(lastMonthStart, monthStart);
    const a = thisMonth.reduce((s, x) => s + Number(x.value), 0);
    const b = lastMonth.reduce((s, x) => s + Number(x.value), 0);
    const max = Math.max(a, b, 1);
    content.won = (
      <div className="space-y-4">
        <div>
          <p className="text-3xl font-semibold tabular-nums">{money(a)}</p>
          <p className="text-sm text-muted">
            {d.wonDeals(thisMonth.length)}
            {b > 0 && <span className={a >= b ? " text-brand" : " text-danger"}> · {d.vsLast(Math.round(((a - b) / b) * 100))}</span>}
          </p>
        </div>
        {[
          { label: d.wonThisMonth, v: a, cls: "bg-brand" },
          { label: d.wonLastMonth, v: b, cls: "bg-brand/35" },
        ].map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{r.label}</span>
              <span className="tabular-nums">{money(r.v)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background">
              <div className={`h-full rounded-full ${r.cls}`} style={{ width: `${(r.v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (on.has("pipeline")) {
    const rows = (stages ?? [])
      .filter((s) => !s.is_won && !s.is_lost)
      .map((s) => {
        const items = open.filter((x) => x.stage_id === s.id);
        return { s, n: items.length, sum: items.reduce((acc, x) => acc + Number(x.value), 0) };
      });
    const max = Math.max(1, ...rows.map((r) => r.sum));
    const weighted = rows.reduce((acc, r) => acc + (r.sum * (r.s.probability ?? 0)) / 100, 0);
    content.pipeline =
      rows.length === 0 ? (
        <p className="text-sm text-muted">{d.none}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.s.id}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate">
                  {stageLabel(stageName(r.s.name, locale), r.s.pipeline_id, pipelines)} <span className="text-muted">· {r.n}</span>
                </span>
                <span className="tabular-nums text-muted">{money(r.sum)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-brand/70" style={{ width: `${(r.sum / max) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="border-t border-border pt-2 text-xs text-muted">
            {t.deals.total}: <strong className="text-foreground">{money(openTotal)}</strong> · {t.ui.board.weighted}{" "}
            <strong className="text-foreground">{money(weighted)}</strong>
          </p>
        </div>
      );
  }

  if (on.has("stale")) {
    content.stale =
      stale.length === 0 ? (
        <p className="text-sm text-muted">✓ {d.none}</p>
      ) : (
        <ul className="divide-y divide-border">
          {stale.slice(0, 8).map((x) => (
            <li key={x.id} data-del={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <Link href={`/app/salg/${x.id}`} className="block truncate hover:text-brand">
                  {x.title}
                </Link>
                <span className="block truncate text-xs text-amber-700">
                  {d.daysStale(Math.floor((now - new Date(x.updated_at).getTime()) / DAY))}
                  {x.companies?.name && <span className="text-muted"> · {x.companies.name}</span>}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">{money(Number(x.value))}</span>
            </li>
          ))}
        </ul>
      );
  }

  if (on.has("quotes")) {
    content.quotes =
      quotes.length === 0 ? (
        <p className="text-sm text-muted">{d.none}</p>
      ) : (
        <ul className="divide-y divide-border">
          {quotes.slice(0, 6).map((q) => (
            <li key={q.id} data-del={q.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <Link href={`/app/tilbud/${q.id}`} className="block truncate hover:text-brand">
                  #{q.number} {q.title}
                </Link>
                <span className="block truncate text-xs text-muted">
                  {q.companies?.name ?? ""}
                  {q.status === "sent" && q.viewed_at && <span className="text-brand"> · 👁 {d.viewed}</span>}
                </span>
              </span>
              <StatusBadge status={q.status as QuoteStatus} label={t.quotes.statuses[q.status as QuoteStatus]} />
            </li>
          ))}
        </ul>
      );
  }

  if (on.has("activity")) {
    const items = activityRes?.data ?? [];
    const label = (type: string) =>
      (t.crm.noteTypes as Record<string, string>)[type] ?? (t.crm.activity as Record<string, string>)[type] ?? type;
    const ICON = ACTIVITY_ICON;
    content.activity =
      items.length === 0 ? (
        <p className="text-sm text-muted">{t.crm.noActivity}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const who = a.profiles?.full_name || a.profiles?.email || "";
            const target = a.deals
              ? { href: `/app/salg/${a.deals.id}`, label: a.deals.title }
              : a.contacts
                ? { href: `/app/kontakter/${a.contacts.id}`, label: contactName(a.contacts) }
                : a.companies
                  ? { href: `/app/bedrifter/${a.companies.id}`, label: a.companies.name }
                  : null;
            return (
              <li key={a.id} data-del={a.id} className="flex gap-3 text-sm">
                {who ? <Avatar name={who} size="md" title={who} /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background">{ICON[a.type] ?? "•"}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span aria-hidden>{ICON[a.type] ?? "•"} </span>
                    <span className="font-medium">{label(a.type)}</span>
                    {(a.type === "stage_change" || a.type === "created") && a.body && <span> {a.body}</span>}
                    {target && (
                      <>
                        {" · "}
                        <Link href={target.href} className="text-brand hover:underline">
                          {target.label}
                        </Link>
                      </>
                    )}
                  </p>
                  {a.body && !["stage_change", "created", "won", "lost"].includes(a.type) && <p className="line-clamp-2 text-xs text-muted">{a.body}</p>}
                  <p className="text-xs text-muted">
                    {who && `${who} · `}
                    {new Date(a.occurred_at).toLocaleString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      );
  }

  if (on.has("quick")) {
    const q = t.ui.quick;
    content.quick = (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: "/app/oppgaver#ny-oppgave", label: q.task, icon: "✓" },
          { href: "/app/kontakter/ny", label: q.contact, icon: "👤" },
          { href: "/app/bedrifter/ny", label: q.company, icon: "🏢" },
          { href: "/app/salg/ny", label: q.deal, icon: "💰" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-4 text-center text-sm hover:border-brand hover:text-brand">
            <span aria-hidden className="text-xl">
              {x.icon}
            </span>
            {x.label}
          </Link>
        ))}
      </div>
    );
  }

  if (on.has("start")) {
    content.start = allDone ? (
      <p className="text-sm text-brand">✓ {t.today.getStarted}</p>
    ) : (
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] ${s.done ? "border-brand bg-brand text-white" : "border-border text-transparent"}`}
            >
              ✓
            </span>
            <span className={`flex-1 ${s.done ? "text-muted line-through" : ""}`}>{s.label}</span>
            {!s.done && s.href && (
              <ButtonLink href={s.href} variant="secondary" className="!px-3 !py-1 text-xs">
                {t.today.doItNow}
              </ButtonLink>
            )}
          </li>
        ))}
      </ol>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0];
  const part = hour < 10 ? "morning" : hour < 18 ? "day" : "evening";
  const dateLine = new Date(now).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Oslo" });

  return (
    <div className="space-y-6">
      <InstallApp
        banner
        t={{
          title: t.mobile.installTitle,
          intro: t.mobile.installIntro,
          install: t.mobile.install,
          installed: t.mobile.installed,
          iosSteps: t.mobile.iosSteps,
          otherBrowsers: t.mobile.otherBrowsers,
          dismiss: t.mobile.dismiss,
        }}
      />
      <DashboardGrid
        layout={layout}
        defaults={defaults}
        content={content}
        links={links}
        header={
          <header>
            <p className="text-sm text-muted first-letter:uppercase">{dateLine}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{t.ui.greeting(part, firstName)}</h1>
          </header>
        }
        t={{
          customize: d.customize,
          done: d.done,
          editHint: d.editHint,
          hide: d.hide,
          moveUp: d.moveUp,
          moveDown: d.moveDown,
          drag: d.drag,
          wide: d.wide,
          narrow: d.narrow,
          resize: d.resize,
          add: d.add,
          allShown: d.allShown,
          reset: d.reset,
          empty: d.empty,
          seeAll: d.seeAll,
          names: d.names,
        }}
      />
    </div>
  );
}
