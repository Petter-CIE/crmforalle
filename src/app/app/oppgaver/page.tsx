import type { Metadata } from "next";
import Link from "next/link";
import { TASK_SELECT, TaskForm, TaskRows, type TaskRow } from "@/components/crm/task-list";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.tasks.title };
}

const VIEWS = ["mine", "alle", "fullfort"] as const;
type View = (typeof VIEWS)[number];

export default async function TasksPage({ searchParams }: PageProps<"/app/oppgaver">) {
  const { vis } = await searchParams;
  const view: View = VIEWS.includes(vis as View) ? (vis as View) : "mine";
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();

  let q = supabase.from("tasks").select(TASK_SELECT).eq("workspace_id", workspace.id).limit(500);
  if (view === "fullfort") q = q.not("done_at", "is", null).order("done_at", { ascending: false });
  else q = q.is("done_at", null).order("due_at", { ascending: true, nullsFirst: false });
  if (view === "mine") q = q.eq("assignee_id", user.id);
  const [{ data }, members] = await Promise.all([q, listMembers(ctx)]);
  const tasks = (data ?? []) as TaskRow[];
  const path = `/app/oppgaver${view === "mine" ? "" : `?vis=${view}`}`;

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const groups =
    view === "fullfort"
      ? [{ key: "done", label: t.tasks.done, items: tasks }]
      : [
          { key: "overdue", label: t.tasks.overdue, items: tasks.filter((x) => x.due_at && new Date(x.due_at) < startOfToday) },
          {
            key: "today",
            label: t.tasks.today,
            items: tasks.filter((x) => x.due_at && new Date(x.due_at) >= startOfToday && new Date(x.due_at) < startOfTomorrow),
          },
          { key: "upcoming", label: t.tasks.upcoming, items: tasks.filter((x) => x.due_at && new Date(x.due_at) >= startOfTomorrow) },
          { key: "nodate", label: t.tasks.noDate, items: tasks.filter((x) => !x.due_at) },
        ];

  const tabs: { v: View; label: string }[] = [
    { v: "mine", label: t.tasks.mine },
    { v: "alle", label: t.tasks.all },
    { v: "fullfort", label: t.tasks.done },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.tasks.title} />
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.v}
            href={tab.v === "mine" ? "/app/oppgaver" : `/app/oppgaver?vis=${tab.v}`}
            aria-current={view === tab.v ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === tab.v ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {view !== "fullfort" && (
        <Card>
          <TaskForm path={path} members={members} me={user.id} t={t.tasks} save={t.crm.saving} />
        </Card>
      )}
      {groups
        .filter((g) => g.items.length > 0 || (view === "fullfort" && g.key === "done"))
        .map((g) => (
          <Card key={g.key}>
            <h2 className={`mb-2 text-sm font-semibold ${g.key === "overdue" ? "text-danger" : ""}`}>
              {g.label} ({g.items.length})
            </h2>
            <TaskRows tasks={g.items} path={path} showLinks />
          </Card>
        ))}
      {view !== "fullfort" && tasks.length === 0 && <p className="text-sm text-muted">{t.tasks.empty}</p>}
    </div>
  );
}
