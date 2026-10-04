import "server-only";
import { listMembers } from "@/lib/crm";
import type { requireWorkspace } from "@/lib/session";
import { nowMs } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { stageName } from "@/lib/stages";
import { loadPipelines, orderStages, stageLabel } from "@/lib/pipelines";

type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;

export const PERIODS = ["mnd", "forrige", "kvartal", "ar", "12m"] as const;
export type Period = (typeof PERIODS)[number];
export function isPeriod(v: unknown): v is Period {
  return typeof v === "string" && (PERIODS as readonly string[]).includes(v);
}

const TZ = "Europe/Oslo";
const PAGE = 1000;
const MAX_ROWS = 20_000;

/** Offset of Oslo time from UTC (ms) at the given instant. */
function osloOffset(ms: number) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

/** UTC instant of midnight on the first of a month in Oslo. Month may overflow (13 → next year). */
function monthStart(year: number, month0: number) {
  const guess = Date.UTC(year, month0, 1);
  return guess - osloOffset(guess);
}

function osloYearMonth(ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(new Date(ms));
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month0: Number(parts.find((p) => p.type === "month")?.value) - 1,
  };
}

export function periodRange(period: Period, now = nowMs()) {
  const { year, month0 } = osloYearMonth(now);
  const q0 = Math.floor(month0 / 3) * 3;
  const [from, to] =
    period === "forrige"
      ? [monthStart(year, month0 - 1), monthStart(year, month0)]
      : period === "kvartal"
        ? [monthStart(year, q0), monthStart(year, q0 + 3)]
        : period === "ar"
          ? [monthStart(year, 0), monthStart(year + 1, 0)]
          : period === "12m"
            ? [monthStart(year, month0 - 11), monthStart(year, month0 + 1)]
            : [monthStart(year, month0), monthStart(year, month0 + 1)];
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

/** The last 12 calendar months (Oslo), oldest first, each with its [from, to) range. */
function last12Months(now = nowMs()) {
  const { year, month0 } = osloYearMonth(now);
  return Array.from({ length: 12 }, (_, i) => {
    const m = month0 - 11 + i;
    return { from: new Date(monthStart(year, m)).toISOString(), to: new Date(monthStart(year, m + 1)).toISOString(), monthStart: monthStart(year, m) };
  });
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const inRange = (v: string | null, r: { from: string; to: string }) => !!v && v >= r.from && v < r.to;
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

export type MemberRow = {
  id: string;
  name: string;
  won: number;
  wonValue: number;
  newDeals: number;
  calls: number;
  meetings: number;
  notes: number;
  emails: number;
  tasksDone: number;
  overdue: number;
};

export async function buildReport(ctx: Ctx, period: Period, requestedOwner: string | null) {
  const { supabase, workspace } = ctx;
  const { locale } = await getI18n();
  const ws = workspace.id;
  const range = periodRange(period);
  const months = last12Months();
  const nowIso = new Date(nowMs()).toISOString();

  const [members, { data: stagesData }, deals, activities, tasksDone, overdue, pipelines] = await Promise.all([
    listMembers(ctx),
    supabase.from("pipeline_stages").select("id, name, position, probability, is_won, is_lost, pipeline_id").eq("workspace_id", ws),
    fetchAll((a, b) =>
      supabase
        .from("deals")
        .select("id, value, stage_id, owner_id, created_at, closed_at, lost_reason")
        .eq("workspace_id", ws)
        .order("created_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      supabase
        .from("activities")
        .select("type, author_id")
        .eq("workspace_id", ws)
        .in("type", ["call", "meeting", "note", "email"])
        .gte("occurred_at", range.from)
        .lt("occurred_at", range.to)
        .order("occurred_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      supabase
        .from("tasks")
        .select("assignee_id")
        .eq("workspace_id", ws)
        .gte("done_at", range.from)
        .lt("done_at", range.to)
        .order("done_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      supabase
        .from("tasks")
        .select("assignee_id")
        .eq("workspace_id", ws)
        .is("done_at", null)
        .lt("due_at", nowIso)
        .order("due_at")
        .range(a, b),
    ),
    loadPipelines(supabase, ws),
  ]);

  const ownerId = members.some((m) => m.id === requestedOwner) ? requestedOwner : null;
  const stages = orderStages(stagesData ?? [], pipelines);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const isWon = (d: { stage_id: string }) => !!stageById.get(d.stage_id)?.is_won;
  const isLost = (d: { stage_id: string }) => !!stageById.get(d.stage_id)?.is_lost;
  const isOpen = (d: { stage_id: string }) => !isWon(d) && !isLost(d);
  const value = (d: { value: number }) => Number(d.value);

  const scoped = ownerId ? deals.filter((d) => d.owner_id === ownerId) : deals;
  const won = scoped.filter((d) => isWon(d) && inRange(d.closed_at, range));
  const lost = scoped.filter((d) => isLost(d) && inRange(d.closed_at, range));
  const created = scoped.filter((d) => inRange(d.created_at, range));
  const open = scoped.filter(isOpen);
  const cycleDays = won
    .map((d) => (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / 86_400_000)
    .filter((n) => n >= 0);

  const pipeline = stages
    .filter((s) => !s.is_won && !s.is_lost)
    .map((s) => {
      const rows = open.filter((d) => d.stage_id === s.id);
      const total = sum(rows, value);
      return { id: s.id, name: stageLabel(stageName(s.name, locale), s.pipeline_id, pipelines), probability: s.probability, count: rows.length, value: total, weighted: (total * s.probability) / 100 };
    });

  const trend = months.map((m) => {
    const rows = scoped.filter((d) => isWon(d) && inRange(d.closed_at, m));
    return { monthStart: m.monthStart, count: rows.length, value: sum(rows, value) };
  });

  const reasons = new Map<string, number>();
  for (const d of lost) {
    const r = d.lost_reason?.trim();
    if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const lostReasons = [...reasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reason, count]) => ({ reason, count }));

  const activityCounts = { call: 0, meeting: 0, note: 0, email: 0 };
  for (const a of activities) activityCounts[a.type as keyof typeof activityCounts]++;

  // Team table always covers everyone, so the owner filter doesn't hide colleagues.
  const team: MemberRow[] = members
    .map((m) => {
      const mine = deals.filter((d) => d.owner_id === m.id);
      const myWon = mine.filter((d) => isWon(d) && inRange(d.closed_at, range));
      const acts = activities.filter((a) => a.author_id === m.id);
      return {
        id: m.id,
        name: m.name,
        won: myWon.length,
        wonValue: sum(myWon, value),
        newDeals: mine.filter((d) => inRange(d.created_at, range)).length,
        calls: acts.filter((a) => a.type === "call").length,
        meetings: acts.filter((a) => a.type === "meeting").length,
        notes: acts.filter((a) => a.type === "note").length,
        emails: acts.filter((a) => a.type === "email").length,
        tasksDone: tasksDone.filter((t) => t.assignee_id === m.id).length,
        overdue: overdue.filter((t) => t.assignee_id === m.id).length,
      };
    })
    .sort((a, b) => b.wonValue - a.wonValue || b.won - a.won || a.name.localeCompare(b.name));

  const decided = won.length + lost.length;
  return {
    range,
    members,
    ownerId,
    kpi: {
      wonCount: won.length,
      wonValue: sum(won, value),
      lostCount: lost.length,
      lostValue: sum(lost, value),
      winRate: decided ? Math.round((won.length / decided) * 100) : null,
      avgDeal: won.length ? sum(won, value) / won.length : null,
      avgCycleDays: cycleDays.length ? Math.round(sum(cycleDays, (n) => n) / cycleDays.length) : null,
      newCount: created.length,
      newValue: sum(created, value),
      openCount: open.length,
      openValue: sum(open, value),
      weightedValue: sum(pipeline, (p) => p.weighted),
    },
    pipeline,
    trend,
    lostReasons,
    activityCounts,
    team,
    hasDeals: deals.length > 0,
    truncated: deals.length >= MAX_ROWS,
  };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;
