import type { Metadata } from "next";
import Link from "next/link";
import { TASK_SELECT, TaskRows, type TaskRow } from "@/components/crm/task-list";
import { ButtonLink, Card } from "@/components/ui";
import { canManage, requireWorkspace } from "@/lib/session";
import { formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { daysAgoIso } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.today.title };
}

export default async function TodayPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const staleBefore = daysAgoIso(14);

  const [{ data: profile }, { count: memberCount }, { count: companyCount }, { data: stages }, { data: deals }, { data: tasks }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
      supabase.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
      supabase.from("pipeline_stages").select("id, is_won, is_lost").eq("workspace_id", workspace.id),
      supabase.from("deals").select("id, title, value, stage_id, updated_at").eq("workspace_id", workspace.id).limit(2000),
      supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("workspace_id", workspace.id)
        .eq("assignee_id", user.id)
        .is("done_at", null)
        .lte("due_at", endOfToday.toISOString())
        .order("due_at")
        .limit(50),
    ]);
  const openIds = new Set((stages ?? []).filter((s) => !s.is_won && !s.is_lost).map((s) => s.id));
  const openDeals = (deals ?? []).filter((d) => openIds.has(d.stage_id));
  const openTotal = openDeals.reduce((s, d) => s + Number(d.value), 0);
  const stale = openDeals.filter((d) => d.updated_at < staleBefore);
  const firstName = profile?.full_name?.split(" ")[0];

  const steps = [
    { done: true, label: t.today.stepCreate, href: null },
    { done: (memberCount ?? 0) > 1, label: t.today.stepInvite, href: canManage(workspace.role) ? "/app/innstillinger#brukere" : null },
    { done: (companyCount ?? 0) > 0, label: t.today.stepCustomers, href: "/app/bedrifter/ny" },
    { done: (deals ?? []).length > 0, label: t.today.stepPipeline, href: "/app/salg/ny" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.today.hello(firstName)}</h1>
        <p className="text-sm text-muted">{t.today.intro}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/app/oppgaver">
          <Card className="!p-5 hover:border-brand">
            <p className="text-xs text-muted">{t.today.myTasks}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{tasks?.length ?? 0}</p>
          </Card>
        </Link>
        <Link href="/app/salg">
          <Card className="!p-5 hover:border-brand">
            <p className="text-xs text-muted">{t.today.openDeals}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(openTotal, dateLocale)}</p>
            <p className="text-xs text-muted">{openDeals.length}</p>
          </Card>
        </Link>
        <Card className="!p-5">
          <p className="text-xs text-muted">{t.today.stale}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${stale.length ? "text-amber-600" : ""}`}>{stale.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">{t.today.myTasks}</h2>
          <TaskRows tasks={(tasks ?? []) as TaskRow[]} path="/app" showLinks />
        </Card>
        {stale.length > 0 && (
          <Card>
            <h2 className="mb-2 font-semibold">{t.today.stale}</h2>
            <ul className="divide-y divide-border">
              {stale.slice(0, 10).map((d) => (
                <li key={d.id} className="flex justify-between gap-3 py-2 text-sm">
                  <Link href={`/app/salg/${d.id}`} className="truncate hover:text-brand">
                    {d.title}
                  </Link>
                  <span className="tabular-nums text-muted">{formatMoney(Number(d.value), dateLocale)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!allDone && (
          <Card>
            <h2 className="mb-4 font-semibold">{t.today.getStarted}</h2>
            <ol className="space-y-3">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                      s.done ? "border-brand bg-brand text-white" : "border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                  {!s.done && s.href && (
                    <ButtonLink href={s.href} variant="secondary" className="ml-auto !px-3 !py-1 text-xs">
                      {t.today.doItNow}
                    </ButtonLink>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
