import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Card, Input, Select } from "@/components/ui";
import { EmptyState, Field, PageHeader, Textarea } from "@/components/ui-extra";
import { deleteTask } from "@/app/app/crm-actions";
import { contactName, formatDateTime, listMembers, PROJECT_COLORS, type ProjectColor } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import {
  addTaskComment,
  addTaskMember,
  deleteAttachment,
  deleteTaskComment,
  removeTaskMember,
  setTaskStatus,
  updateTask,
} from "../actions";
import { AttachmentUpload } from "./attachment-upload";

export async function generateMetadata({ params }: PageProps<"/app/oppgaver/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("tasks").select("title").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data?.title ?? "" };
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** yyyy-mm-dd in Oslo time for <input type="date"> */
function dateInput(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
}

export default async function TaskPage({ params }: PageProps<"/app/oppgaver/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t, dateLocale } = await getI18n();
  const tt = t.tasks;

  const [{ data: task }, { data: comments }, { data: files }, members, { data: projects }, { data: collab }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "*, companies(id, name), contacts(id, first_name, last_name), deals(id, title), projects(id, name, color)",
      )
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("task_comments")
      .select("id, body, created_at, author_id, profiles(full_name, email)")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_attachments")
      .select("id, name, size, mime, created_at, uploaded_by, profiles(full_name, email)")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    listMembers(ctx),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
    supabase.from("task_members").select("user_id").eq("task_id", id).order("created_at"),
  ]);
  if (!task) notFound();

  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const collabIds = (collab ?? []).map((c) => c.user_id);
  const addable = members.filter((m) => m.id !== task.assignee_id && !collabIds.includes(m.id));
  const initial = (name: string) => name.slice(0, 1).toUpperCase();
  const status = task.done_at ? "done" : task.started_at ? "in_progress" : "open";
  const statuses = [
    { v: "open", label: tt.statusOpen, on: "bg-zinc-200 text-foreground" },
    { v: "in_progress", label: tt.statusInProgress, on: "bg-amber-100 text-amber-900" },
    { v: "done", label: tt.statusDone, on: "bg-brand text-white" },
  ] as const;
  const projectOptions = [...(projects ?? [])];
  if (task.projects && !projectOptions.some((p) => p.id === task.projects!.id)) projectOptions.push(task.projects);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className={task.done_at ? "text-muted line-through" : ""}>{task.title}</span>}
        subtitle={tt.createdBy(
          (task.created_by && nameOf.get(task.created_by)) || "?",
          formatDateTime(task.created_at, dateLocale),
        )}
        backHref="/app/oppgaver"
        backLabel={tt.back}
        actions={
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="tilbake" value="/app/oppgaver" />
            <input type="hidden" name="redirect" value="1" />
            <ConfirmButton message={t.crm.confirmDelete} variant="danger">
              {t.crm.delete}
            </ConfirmButton>
          </form>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tt.status}>
        {statuses.map((s) => (
          <form key={s.v} action={setTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value={s.v} />
            <button
              type="submit"
              aria-pressed={status === s.v}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === s.v ? s.on : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {s.v === "done" && status === "done" ? "✓ " : ""}
              {s.label}
            </button>
          </form>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">{tt.comments}</h2>
            {!comments || comments.length === 0 ? (
              <EmptyState>{tt.noComments}</EmptyState>
            ) : (
              <ul className="space-y-4">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
                    >
                      {(c.profiles?.full_name || c.profiles?.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">
                        <span className="font-medium text-foreground">{c.profiles?.full_name || c.profiles?.email || "?"}</span>{" "}
                        · {formatDateTime(c.created_at, dateLocale)}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                    {c.author_id === user.id && (
                      <form action={deleteTaskComment}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="task_id" value={task.id} />
                        <button type="submit" className="text-xs text-muted hover:text-danger" aria-label={t.crm.delete}>
                          ✕
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <ActionForm
              action={addTaskComment}
              submitLabel={tt.addComment}
              pendingLabel={t.crm.saving}
              resetOnSuccess
              className="mt-4 space-y-2"
            >
              <input type="hidden" name="task_id" value={task.id} />
              <Textarea name="body" rows={3} required placeholder={tt.commentPlaceholder} aria-label={tt.addComment} />
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{tt.attachments}</h2>
            {!files || files.length === 0 ? (
              <p className="mb-3 text-sm text-muted">{tt.noAttachments}</p>
            ) : (
              <ul className="mb-4 divide-y divide-border">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                    <span aria-hidden>{f.mime?.startsWith("image/") ? "🖼️" : f.mime === "application/pdf" ? "📄" : "📎"}</span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/app/oppgaver/${task.id}/vedlegg/${f.id}`}
                        target="_blank"
                        rel="noopener"
                        className="block truncate font-medium hover:text-brand hover:underline"
                      >
                        {f.name}
                      </a>
                      <p className="text-xs text-muted">
                        {fileSize(f.size)} · {f.profiles?.full_name || f.profiles?.email || "?"} ·{" "}
                        {formatDateTime(f.created_at, dateLocale)}
                      </p>
                    </div>
                    <a
                      href={`/app/oppgaver/${task.id}/vedlegg/${f.id}?last-ned=1`}
                      className="text-xs text-muted hover:text-brand"
                      aria-label={`Download ${f.name}`}
                    >
                      ⬇
                    </a>
                    <form action={deleteAttachment}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton message={t.crm.confirmDelete} variant="ghost" className="!px-1 text-xs text-muted hover:text-danger">
                        ✕
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <AttachmentUpload
              workspaceId={workspace.id}
              taskId={task.id}
              t={{
                upload: tt.upload,
                uploading: tt.uploading,
                maxSize: tt.maxSize,
                tooLarge: tt.tooLarge("{name}"),
                uploadFailed: tt.uploadFailed("{name}"),
              }}
            />
          </Card>
        </div>

        <div className="space-y-6">
          {members.length > 1 && (
            <Card>
              <h2 className="mb-3 font-semibold">{tt.people}</h2>
              <ul className="space-y-2 text-sm">
                {task.assignee_id && (
                  <li className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
                      {initial(nameOf.get(task.assignee_id) ?? "?")}
                    </span>
                    <span className="flex-1 truncate font-medium">{nameOf.get(task.assignee_id) ?? "?"}</span>
                    <span className="text-xs text-muted">{tt.responsible}</span>
                  </li>
                )}
                {collabIds.map((cid) => (
                  <li key={cid} className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                      {initial(nameOf.get(cid) ?? "?")}
                    </span>
                    <span className="flex-1 truncate">{nameOf.get(cid) ?? "?"}</span>
                    <form action={removeTaskMember}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="user_id" value={cid} />
                      <button type="submit" className="text-xs text-muted hover:text-danger" aria-label={tt.remove}>
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              {collabIds.length === 0 && <p className="mt-2 text-xs text-muted">{tt.noCollaborators}</p>}
              {addable.length > 0 && (
                <form action={addTaskMember} className="mt-3 flex gap-2">
                  <input type="hidden" name="task_id" value={task.id} />
                  <Select name="user_id" required defaultValue="" aria-label={tt.addCollaborator} className="min-w-0 flex-1">
                    <option value="" disabled>
                      {tt.addCollaborator}
                    </option>
                    {addable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">
                    {t.tasks.add}
                  </Button>
                </form>
              )}
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-semibold">{tt.details}</h2>
            <ActionForm action={updateTask} submitLabel={t.crm.save} pendingLabel={t.crm.saving} successText={t.settings.saved}>
              <input type="hidden" name="id" value={task.id} />
              <Field label={`${t.deals.dealTitle} *`} htmlFor="t_title">
                <Input id="t_title" name="title" required defaultValue={task.title} className="w-full" />
              </Field>
              <Field label={tt.description} htmlFor="t_desc">
                <Textarea
                  id="t_desc"
                  name="description"
                  rows={5}
                  defaultValue={task.description ?? ""}
                  placeholder={tt.descriptionPlaceholder}
                />
              </Field>
              <Field label={tt.due} htmlFor="t_due">
                <Input id="t_due" name="due" type="date" defaultValue={dateInput(task.due_at)} className="w-full" />
              </Field>
              {members.length > 1 && (
                <Field label={tt.assignee} htmlFor="t_assignee">
                  <Select id="t_assignee" name="assignee_id" defaultValue={task.assignee_id ?? ""} className="w-full">
                    {!task.assignee_id && <option value="">–</option>}
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label={tt.project} htmlFor="t_project">
                <Select id="t_project" name="project_id" defaultValue={task.project_id ?? ""} className="w-full">
                  <option value="">{tt.noProject}</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </ActionForm>
          </Card>

          {(task.projects || task.deals || task.contacts || task.companies) && (
            <Card>
              <h2 className="mb-2 font-semibold">{tt.for}</h2>
              <ul className="space-y-1.5 text-sm">
                {task.projects && (
                  <li>
                    <Link href={`/app/prosjekter/${task.projects.id}`} className="inline-flex items-center gap-2 hover:text-brand">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${PROJECT_COLORS[task.projects.color as ProjectColor] ?? "bg-zinc-400"}`}
                      />
                      {task.projects.name}
                    </Link>
                  </li>
                )}
                {task.deals && (
                  <li>
                    <Link href={`/app/salg/${task.deals.id}`} className="hover:text-brand">
                      💼 {task.deals.title}
                    </Link>
                  </li>
                )}
                {task.contacts && (
                  <li>
                    <Link href={`/app/kontakter/${task.contacts.id}`} className="hover:text-brand">
                      👤 {contactName(task.contacts)}
                    </Link>
                  </li>
                )}
                {task.companies && (
                  <li>
                    <Link href={`/app/bedrifter/${task.companies.id}`} className="hover:text-brand">
                      🏢 {task.companies.name}
                    </Link>
                  </li>
                )}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
