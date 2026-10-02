import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Input, Select } from "@/components/ui";
import { EmptyState } from "@/components/ui-extra";
import { createTask, deleteTask, reassignTask, toggleTask } from "@/app/app/crm-actions";
import { contactName, formatDate, listMembers, PROJECT_COLORS, type ProjectColor } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { nowMs } from "@/lib/time";
import { requireWorkspace } from "@/lib/session";

export type TaskRow = {
  id: string;
  title: string;
  due_at: string | null;
  done_at: string | null;
  started_at: string | null;
  assignee_id: string | null;
  task_comments?: { count: number }[];
  task_attachments?: { count: number }[];
  companies?: { id: string; name: string } | null;
  contacts?: { id: string; first_name: string; last_name: string | null } | null;
  deals?: { id: string; title: string } | null;
  projects?: { id: string; name: string; color: string } | null;
};

type Member = { id: string; name: string };
type Links = { company_id?: string | null; contact_id?: string | null; deal_id?: string | null; project_id?: string | null };

export const TASK_SELECT =
  "id, title, due_at, done_at, started_at, assignee_id, task_comments(count), task_attachments(count), companies(id, name), contacts(id, first_name, last_name), deals(id, title), projects(id, name, color)";

/** Renders tasks with a done checkbox; shows what each task relates to when `showLinks`. */
export async function TaskRows({
  tasks,
  path,
  showLinks = false,
  members: given,
}: {
  tasks: TaskRow[];
  path: string;
  showLinks?: boolean;
  members?: Member[];
}) {
  const { t, dateLocale } = await getI18n();
  const members = given ?? (await listMembers(await requireWorkspace()));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const team = members.length > 1;
  const now = nowMs();
  if (tasks.length === 0) return <EmptyState>{t.tasks.empty}</EmptyState>;
  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const overdue = !task.done_at && task.due_at && new Date(task.due_at).getTime() < now;
        return (
          <li key={task.id} className="flex items-start gap-3 py-2.5">
            <form action={toggleTask}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="done" value={task.done_at ? "false" : "true"} />
              <input type="hidden" name="tilbake" value={path} />
              <button
                type="submit"
                aria-label={task.done_at ? t.tasks.reopen : t.tasks.markDone}
                className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                  task.done_at ? "border-brand bg-brand text-white" : "border-border hover:border-brand"
                }`}
              >
                {task.done_at ? "✓" : ""}
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <Link
                href={`/app/oppgaver/${task.id}`}
                className={`text-sm hover:text-brand hover:underline ${task.done_at ? "text-muted line-through" : ""}`}
              >
                {task.title}
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                {task.started_at && !task.done_at && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{t.tasks.inProgress}</span>
                )}
                {(task.task_comments?.[0]?.count ?? 0) > 0 && (
                  <span title={t.tasks.comments}>💬 {task.task_comments![0].count}</span>
                )}
                {(task.task_attachments?.[0]?.count ?? 0) > 0 && (
                  <span title={t.tasks.attachments}>📎 {task.task_attachments![0].count}</span>
                )}
                {task.due_at && <span className={overdue ? "font-medium text-danger" : ""}>{formatDate(task.due_at, dateLocale)}</span>}
                {showLinks && task.projects && (
                  <Link href={`/app/prosjekter/${task.projects.id}`} className="inline-flex items-center gap-1 hover:underline">
                    <span className={`h-2 w-2 rounded-full ${PROJECT_COLORS[task.projects.color as ProjectColor] ?? "bg-zinc-400"}`} />
                    {task.projects.name}
                  </Link>
                )}
                {showLinks && task.deals && (
                  <Link href={`/app/salg/${task.deals.id}`} className="hover:underline">
                    {task.deals.title}
                  </Link>
                )}
                {showLinks && task.contacts && (
                  <Link href={`/app/kontakter/${task.contacts.id}`} className="hover:underline">
                    {contactName(task.contacts)}
                  </Link>
                )}
                {showLinks && task.companies && (
                  <Link href={`/app/bedrifter/${task.companies.id}`} className="hover:underline">
                    {task.companies.name}
                  </Link>
                )}
              </div>
            </div>
            {team &&
              (task.done_at ? (
                <span className="text-xs text-muted">{task.assignee_id ? nameOf.get(task.assignee_id) : ""}</span>
              ) : (
                <form action={reassignTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="tilbake" value={path} />
                  <AutoSubmitSelect
                    name="assignee_id"
                    defaultValue={task.assignee_id ?? ""}
                    aria-label={t.tasks.reassign}
                    title={t.tasks.reassign}
                    className="max-w-[9rem] truncate"
                  >
                    {!task.assignee_id && <option value="">–</option>}
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </form>
              ))}
            <form action={deleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="tilbake" value={path} />
              <button type="submit" className="text-xs text-muted hover:text-danger" aria-label={t.crm.delete}>
                ✕
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

/** Tasks for one company/contact/deal plus a quick-add form. */
export async function TaskPanel({ links, path }: { links: Links; path: string }) {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  let q = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("workspace_id", workspace.id)
    .order("done_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);
  if (links.project_id) q = q.eq("project_id", links.project_id);
  else if (links.deal_id) q = q.eq("deal_id", links.deal_id);
  else if (links.contact_id) q = q.eq("contact_id", links.contact_id);
  else if (links.company_id) q = q.eq("company_id", links.company_id);
  const [{ data: tasks }, members] = await Promise.all([q, listMembers(ctx)]);

  return (
    <div className="space-y-4">
      <TaskRows tasks={(tasks ?? []) as TaskRow[]} path={path} members={members} />
      <TaskForm links={links} path={path} members={members} me={user.id} t={t.tasks} save={t.crm.saving} />
    </div>
  );
}

export function TaskForm({
  links = {},
  path,
  members,
  me,
  t,
  save,
  projects,
}: {
  links?: Links;
  path: string;
  members: Member[];
  me: string;
  t: { placeholder: string; due: string; assignee: string; add: string; new: string; noProject: string };
  save: string;
  /** When given, lets the user pick a project for the task. */
  projects?: { id: string; name: string }[];
}) {
  return (
    <ActionForm
      action={createTask}
      submitLabel={t.add}
      pendingLabel={save}
      resetOnSuccess
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="tilbake" value={path} />
      {links.company_id && <input type="hidden" name="company_id" value={links.company_id} />}
      {links.contact_id && <input type="hidden" name="contact_id" value={links.contact_id} />}
      {links.deal_id && <input type="hidden" name="deal_id" value={links.deal_id} />}
      {links.project_id && <input type="hidden" name="project_id" value={links.project_id} />}
      <Input name="title" required placeholder={t.placeholder} aria-label={t.new} className="min-w-[12rem] flex-1" />
      <Input name="due" type="date" aria-label={t.due} className="w-auto" />
      {!links.project_id && projects && projects.length > 0 && (
        <Select name="project_id" defaultValue="" aria-label={t.noProject}>
          <option value="">{t.noProject}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
      {members.length > 1 && (
        <Select name="assignee_id" defaultValue={me} aria-label={t.assignee}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      )}
    </ActionForm>
  );
}
