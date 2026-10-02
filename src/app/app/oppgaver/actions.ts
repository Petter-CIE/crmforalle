"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { notifyAssignment, notifyComment } from "@/lib/notify";
import { requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uid = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" && UUID.test(v) ? v : null);

function refresh(taskId: string) {
  revalidatePath(`/app/oppgaver/${taskId}`);
  revalidatePath("/app/oppgaver");
  revalidatePath("/app");
}

/** Saves title, description, due date, assignee and project of a task. */
export async function updateTask(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const taskId = uid(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  if (!taskId || !title) return { error: t.crm.required };
  const due = String(formData.get("due") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 20000);
  const assigneeId = uid(formData.get("assignee_id"));

  const { data: before } = await supabase
    .from("tasks")
    .select("assignee_id, project_id")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!before) return { error: t.crm.error };

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title,
      description: description || null,
      due_at: /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T09:00`).toISOString() : null,
      ...(formData.has("assignee_id") ? { assignee_id: assigneeId } : {}),
      ...(formData.has("project_id") ? { project_id: uid(formData.get("project_id")) } : {}),
    })
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .select("assignee_id, due_at, done_at, project_id")
    .single();
  if (error) return { error: t.crm.error };

  if (data.assignee_id && data.assignee_id !== before.assignee_id) {
    // the new assignee no longer needs to be listed as a collaborator
    await supabase.from("task_members").delete().eq("task_id", taskId).eq("user_id", data.assignee_id);
  }
  if (data.assignee_id && data.assignee_id !== before.assignee_id && !data.done_at) {
    after(() =>
      notifyAssignment(supabase, {
        kind: "task",
        recipientId: data.assignee_id,
        actorId: user.id,
        workspaceName: workspace.name,
        title,
        dueAt: data.due_at,
        path: `/app/oppgaver/${taskId}`,
      }),
    );
  }
  refresh(taskId);
  for (const p of new Set([before.project_id, data.project_id])) if (p) revalidatePath(`/app/prosjekter/${p}`);
  return { ok: true };
}

/** open → in progress → done (and back). */
export async function setTaskStatus(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const taskId = uid(formData.get("id"));
  const status = String(formData.get("status"));
  if (!taskId || !["open", "in_progress", "done"].includes(status)) return;
  const now = new Date().toISOString();
  const { data: cur } = await supabase
    .from("tasks")
    .select("started_at")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!cur) return;
  const patch =
    status === "open"
      ? { started_at: null, done_at: null }
      : status === "in_progress"
        ? { started_at: cur.started_at ?? now, done_at: null }
        : { done_at: now };
  await supabase.from("tasks").update(patch).eq("id", taskId).eq("workspace_id", workspace.id);
  refresh(taskId);
}

export async function addTaskComment(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const taskId = uid(formData.get("task_id"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 10000);
  if (!taskId || !body) return { error: t.crm.required };
  const { error } = await supabase
    .from("task_comments")
    .insert({ workspace_id: workspace.id, task_id: taskId, author_id: user.id, body });
  if (error) return { error: t.crm.error };
  after(() => notifyComment(supabase, { taskId, authorId: user.id, body }));
  refresh(taskId);
  return { ok: true };
}

export async function deleteTaskComment(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const id = uid(formData.get("id"));
  const taskId = uid(formData.get("task_id"));
  if (id) {
    await supabase.from("task_comments").delete().eq("id", id).eq("workspace_id", workspace.id).eq("author_id", user.id);
  }
  if (taskId) refresh(taskId);
}

/** Records a file the browser has already uploaded to storage. */
export async function registerAttachment(input: { taskId: string; path: string; name: string; size: number; mime: string }) {
  const { supabase, user, workspace } = await requireWorkspace();
  if (!UUID.test(input.taskId)) return { error: true };
  const prefix = `${workspace.id}/tasks/${input.taskId}/`;
  if (!input.path.startsWith(prefix) || input.path.includes("..")) return { error: true };
  const { error } = await supabase.from("task_attachments").insert({
    workspace_id: workspace.id,
    task_id: input.taskId,
    path: input.path,
    name: input.name.slice(0, 255) || "fil",
    size: Math.max(0, Math.floor(input.size)),
    mime: input.mime.slice(0, 200) || null,
    uploaded_by: user.id,
  });
  if (error) {
    await supabase.storage.from("attachments").remove([input.path]);
    return { error: true };
  }
  refresh(input.taskId);
  return { ok: true };
}

export async function deleteAttachment(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const id = uid(formData.get("id"));
  if (!id) return;
  const { data } = await supabase
    .from("task_attachments")
    .select("path, task_id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!data) return;
  await supabase.storage.from("attachments").remove([data.path]);
  await supabase.from("task_attachments").delete().eq("id", id).eq("workspace_id", workspace.id);
  refresh(data.task_id);
}

/** Adds a colleague who works on the task together with the assignee. */
export async function addTaskMember(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const taskId = uid(formData.get("task_id"));
  const userId = uid(formData.get("user_id"));
  if (!taskId || !userId) return;
  const { data: task } = await supabase
    .from("tasks")
    .select("title, due_at, done_at")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!task) return;
  const { error } = await supabase
    .from("task_members")
    .insert({ task_id: taskId, workspace_id: workspace.id, user_id: userId, added_by: user.id });
  if (!error && !task.done_at) {
    after(() =>
      notifyAssignment(supabase, {
        kind: "collab",
        recipientId: userId,
        actorId: user.id,
        workspaceName: workspace.name,
        title: task.title,
        dueAt: task.due_at,
        path: `/app/oppgaver/${taskId}`,
      }),
    );
  }
  refresh(taskId);
}

export async function removeTaskMember(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const taskId = uid(formData.get("task_id"));
  const userId = uid(formData.get("user_id"));
  if (!taskId || !userId) return;
  await supabase.from("task_members").delete().eq("task_id", taskId).eq("user_id", userId).eq("workspace_id", workspace.id);
  refresh(taskId);
}
