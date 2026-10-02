import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { TASK_SELECT, TaskForm, TaskRows, type TaskRow } from "@/components/crm/task-list";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { involvedFilter, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.tasks.title };
}

const VIEWS = ["mine", "alle", "fullfort"] as const;
type View = (typeof VIEWS)[number];

export default async function TasksPage({ searchParams }: PageProps<"/app/oppgaver">) {
  const { vis, person: personParam } = await searchParams;
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  // Owners/admins start with the whole team's tasks; everyone else with their own.
  const defaultView: View = canManage(workspace.role) ? "alle" : "mine";
  const view: View = VIEWS.includes(vis as View) ? (vis as View) : defaultView;
  const { t } = await getI18n();
  const members = await listMembers(ctx);
  const person =
    view !== "mine" && typeof personParam === "string" && members.some((m) => m.id === personParam) ? personParam : null;

  let q = supabase.from("tasks").select(TASK_SELECT).eq("workspace_id", workspace.id).limit(500);
  if (view === "fullfort") q = q.not("done_at", "is", null).order("done_at", { ascending: false });
  else q = q.is("done_at", null).order("due_at", { ascending: true, nullsFirst: false });
  if (view === "mine") q = q.or(await involvedFilter(ctx, user.id));
  else if (person) q = q.or(await involvedFilter(ctx, person));
  const [{ data }, { data: projects }] = await Promise.all([
    q,
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
  ]);
  const tasks = (data ?? []) as TaskRow[];
  const params = new URLSearchParams();
  if (view !== defaultView) params.set("vis", view);
  if (person) params.set("person", person);
  const path = `/app/oppgaver${params.size ? `?${params}` : ""}`;

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const notStarted = tasks.filter((x) => !x.started_at);
  const groups =
    view === "fullfort"
      ? [{ key: "done", label: t.tasks.done, items: tasks }]
      : [
          { key: "progress", label: t.tasks.inProgress, items: tasks.filter((x) => x.started_at) },
          ...[
            { key: "overdue", label: t.tasks.overdue, items: notStarted.filter((x) => x.due_at && new Date(x.due_at) < startOfToday) },
            {
              key: "today",
              label: t.tasks.today,
              items: notStarted.filter(
                (x) => x.due_at && new Date(x.due_at) >= startOfToday && new Date(x.due_at) < startOfTomorrow,
              ),
            },
            {
              key: "upcoming",
              label: t.tasks.upcoming,
              items: notStarted.filter((x) => x.due_at && new Date(x.due_at) >= startOfTomorrow),
            },
            { key: "nodate", label: t.tasks.noDate, items: notStarted.filter((x) => !x.due_at) },
          ],
        ];

  const tabs: { v: View; label: string }[] =
    defaultView === "alle"
      ? [
          { v: "alle", label: t.tasks.all },
          { v: "mine", label: t.tasks.mine },
          { v: "fullfort", label: t.tasks.done },
        ]
      : [
          { v: "mine", label: t.tasks.mine },
          { v: "alle", label: t.tasks.all },
          { v: "fullfort", label: t.tasks.done },
        ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.tasks.title} />
      <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.v}
            href={tab.v === defaultView ? "/app/oppgaver" : `/app/oppgaver?vis=${tab.v}`}
            aria-current={view === tab.v ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === tab.v ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {view !== "mine" && members.length > 1 && (
        <form action="/app/oppgaver" className="flex items-center gap-2 text-sm text-muted">
          <input type="hidden" name="vis" value={view} />
          <label htmlFor="person">{t.tasks.showFor}</label>
          <AutoSubmitSelect id="person" name="person" defaultValue={person ?? ""} className="!text-sm text-foreground">
            <option value="">{t.tasks.everyone}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <button type="submit">OK</button>
          </noscript>
        </form>
      )}
      </div>
      {view !== "fullfort" && (
        <Card>
          <TaskForm
            path={path}
            members={members}
            me={person ?? user.id}
            t={t.tasks}
            save={t.crm.saving}
            projects={projects ?? []}
          />
        </Card>
      )}
      {groups
        .filter((g) => g.items.length > 0 || (view === "fullfort" && g.key === "done"))
        .map((g) => (
          <Card key={g.key}>
            <h2 className={`mb-2 text-sm font-semibold ${g.key === "overdue" ? "text-danger" : ""}`}>
              {g.label} ({g.items.length})
            </h2>
            <TaskRows tasks={g.items} path={path} members={members} showLinks />
          </Card>
        ))}
      {view !== "fullfort" && tasks.length === 0 && <p className="text-sm text-muted">{t.tasks.empty}</p>}
    </div>
  );
}
