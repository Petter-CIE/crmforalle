"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { parseProjectColor } from "@/lib/colors";
import { dbErrorKey, opt } from "@/lib/crm";
import { loadCustomFields, parseCustomValues, type CustomEntity } from "@/lib/custom-fields";
import { getI18n } from "@/lib/i18n/server";
import { notifyAssignment } from "@/lib/notify";
import { flash } from "@/lib/flash";
import { requireWorkspace } from "@/lib/session";

export type FormResult = { error?: string; ok?: boolean; message?: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return uuid.test(s) ? s : null;
}
const NOTE_TYPES = ["note", "call", "meeting", "email"];

async function errorText(error: { code?: string; message?: string } | null, duplicate?: string) {
  const { t } = await getI18n();
  const key = dbErrorKey(error);
  if (key === "limit") return t.crm.limitReached;
  if (key === "duplicate" && duplicate) return duplicate;
  return t.crm.error;
}

/** Custom field values from the form, validated against the company's field definitions. */
async function customFrom(ctx: Awaited<ReturnType<typeof requireWorkspace>>, entity: CustomEntity, formData: FormData) {
  const fields = await loadCustomFields(ctx.supabase, ctx.workspace.id, entity);
  return parseCustomValues(formData, fields);
}

function back(formData: FormData, fallback: string) {
  const v = formData.get("tilbake");
  return typeof v === "string" && v.startsWith("/app") ? v : fallback;
}

// ---------------------------------------------------------------- companies
function companyFields(formData: FormData) {
  const org = String(formData.get("org_number") ?? "").replace(/\s/g, "");
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 200),
    org_number: /^\d{9}$/.test(org) ? org : null,
    address: opt(formData.get("address")),
    postal_code: opt(formData.get("postal_code"), 20),
    city: opt(formData.get("city"), 100),
    nace_code: opt(formData.get("nace_code"), 20),
    nace_description: opt(formData.get("nace_description"), 200),
    website: opt(formData.get("website"), 200),
    email: opt(formData.get("email"), 200),
    phone: opt(formData.get("phone"), 50),
    notes: opt(formData.get("notes"), 5000),
  };
}

export async function createCompany(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  const fields = { ...companyFields(formData), custom: await customFrom(ctx, "company", formData) };
  if (!fields.name) return { error: t.crm.required };
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...fields, workspace_id: workspace.id, owner_id: user.id, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: await errorText(error, t.companies.exists) };
  revalidatePath("/app/bedrifter");
  await flash("created");
  redirect(`/app/bedrifter/${data.id}`);
}

export async function updateCompany(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();
  const companyId = id(formData.get("id"));
  const fields = { ...companyFields(formData), custom: await customFrom(ctx, "company", formData) };
  if (!companyId || !fields.name) return { error: t.crm.required };
  const { error } = await supabase.from("companies").update(fields).eq("id", companyId).eq("workspace_id", workspace.id);
  if (error) return { error: await errorText(error, t.companies.exists) };
  revalidatePath(`/app/bedrifter/${companyId}`);
  await flash("saved");
  redirect(`/app/bedrifter/${companyId}`);
}

// ---------------------------------------------------------------- contacts
function contactFields(formData: FormData) {
  return {
    first_name: String(formData.get("first_name") ?? "").trim().slice(0, 100),
    last_name: opt(formData.get("last_name"), 100),
    email: opt(formData.get("email"), 200),
    phone: opt(formData.get("phone"), 50),
    title: opt(formData.get("title"), 100),
    company_id: id(formData.get("company_id")),
    address: opt(formData.get("address"), 300),
    postal_code: opt(formData.get("postal_code"), 20),
    city: opt(formData.get("city"), 100),
    marketing_consent: formData.get("marketing_consent") === "1",
    notes: opt(formData.get("notes"), 5000),
  };
}

export async function createContact(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  const fields = { ...contactFields(formData), custom: await customFrom(ctx, "contact", formData) };
  if (!fields.first_name) return { error: t.crm.required };
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...fields, workspace_id: workspace.id, owner_id: user.id, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: await errorText(error) };
  const projectId = id(formData.get("project_id"));
  if (projectId) {
    await supabase.from("project_contacts").insert({ workspace_id: workspace.id, project_id: projectId, contact_id: data.id });
  }
  revalidatePath("/app/kontakter");
  await flash("created");
  redirect(back(formData, `/app/kontakter/${data.id}`));
}

export async function updateContact(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();
  const contactId = id(formData.get("id"));
  const fields = { ...contactFields(formData), custom: await customFrom(ctx, "contact", formData) };
  if (!contactId || !fields.first_name) return { error: t.crm.required };
  const { error } = await supabase.from("contacts").update(fields).eq("id", contactId).eq("workspace_id", workspace.id);
  if (error) return { error: await errorText(error) };
  revalidatePath(`/app/kontakter/${contactId}`);
  await flash("saved");
  redirect(`/app/kontakter/${contactId}`);
}

// ---------------------------------------------------------------- projects
export async function createProject(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const color = String(formData.get("color") ?? "green");
  if (!name) return { error: t.crm.required };
  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name,
      description: opt(formData.get("description"), 2000),
      color: parseProjectColor(color, String(formData.get("custom_color") ?? "")) ?? "green",
      owner_id: id(formData.get("owner_id")) ?? user.id,
      created_by: user.id,
    })
    .select("id, owner_id")
    .single();
  if (error) return { error: await errorText(error) };
  after(() =>
    notifyAssignment(supabase, {
      kind: "project",
      recipientId: data.owner_id,
      actorId: user.id,
      workspaceName: workspace.name,
      title: name,
      path: `/app/prosjekter/${data.id}`,
    }),
  );
  revalidatePath("/app/prosjekter");
  await flash("created");
  redirect(`/app/prosjekter/${data.id}`);
}

export async function updateProject(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const projectId = id(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const color = String(formData.get("color") ?? "green");
  if (!projectId || !name) return { error: t.crm.required };
  const ownerId = formData.has("owner_id") ? id(formData.get("owner_id")) : undefined;
  const { data: before } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  const { error } = await supabase
    .from("projects")
    .update({
      name,
      description: opt(formData.get("description"), 2000),
      color: parseProjectColor(color, String(formData.get("custom_color") ?? "")) ?? "green",
      ...(ownerId !== undefined ? { owner_id: ownerId } : {}),
    })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id);
  if (error) return { error: await errorText(error) };
  if (ownerId && ownerId !== before?.owner_id) {
    after(() =>
      notifyAssignment(supabase, {
        kind: "project",
        recipientId: ownerId,
        actorId: user.id,
        workspaceName: workspace.name,
        title: name,
        path: `/app/prosjekter/${projectId}`,
      }),
    );
  }
  revalidatePath(`/app/prosjekter/${projectId}`);
  revalidatePath("/app/prosjekter");
  return { ok: true };
}

export async function setProjectArchived(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const projectId = id(formData.get("id"));
  const archived = formData.get("archived") === "true";
  if (projectId) await supabase.from("projects").update({ archived }).eq("id", projectId).eq("workspace_id", workspace.id);
  revalidatePath("/app/prosjekter");
  revalidatePath(`/app/prosjekter/${projectId}`);
}

export async function addContactToProject(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const projectId = id(formData.get("project_id"));
  const contactId = id(formData.get("contact_id"));
  if (projectId && contactId) {
    await supabase
      .from("project_contacts")
      .upsert({ workspace_id: workspace.id, project_id: projectId, contact_id: contactId }, { ignoreDuplicates: true });
  }
  revalidatePath(`/app/prosjekter/${projectId}`);
  revalidatePath(`/app/kontakter/${contactId}`);
  revalidatePath("/app/kontakter");
}

export async function removeContactFromProject(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const projectId = id(formData.get("project_id"));
  const contactId = id(formData.get("contact_id"));
  if (projectId && contactId) {
    await supabase
      .from("project_contacts")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("contact_id", contactId);
  }
  revalidatePath(`/app/prosjekter/${projectId}`);
  revalidatePath(`/app/kontakter/${contactId}`);
}

export async function addCompanyToProject(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const projectId = id(formData.get("project_id"));
  const companyId = id(formData.get("company_id"));
  if (projectId && companyId) {
    await supabase
      .from("project_companies")
      .upsert({ workspace_id: workspace.id, project_id: projectId, company_id: companyId }, { ignoreDuplicates: true });
  }
  revalidatePath(`/app/prosjekter/${projectId}`);
  revalidatePath(`/app/bedrifter/${companyId}`);
  revalidatePath("/app/bedrifter");
}

export async function removeCompanyFromProject(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const projectId = id(formData.get("project_id"));
  const companyId = id(formData.get("company_id"));
  if (projectId && companyId) {
    await supabase
      .from("project_companies")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("company_id", companyId);
  }
  revalidatePath(`/app/prosjekter/${projectId}`);
  revalidatePath(`/app/bedrifter/${companyId}`);
  revalidatePath("/app/bedrifter");
}

// ---------------------------------------------------------------- deals
function dealFields(formData: FormData) {
  const raw = String(formData.get("value") ?? "").replace(/\s/g, "").replace(",", ".");
  const value = Number(raw);
  const close = String(formData.get("expected_close") ?? "");
  return {
    title: String(formData.get("title") ?? "").trim().slice(0, 200),
    value: Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0,
    stage_id: id(formData.get("stage_id")),
    company_id: id(formData.get("company_id")),
    contact_id: id(formData.get("contact_id")),
    project_id: id(formData.get("project_id")),
    owner_id: id(formData.get("owner_id")),
    expected_close: /^\d{4}-\d{2}-\d{2}$/.test(close) ? close : null,
  };
}

export async function createDeal(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  const fields = { ...dealFields(formData), custom: await customFrom(ctx, "deal", formData) };
  if (!fields.title || !fields.stage_id) return { error: t.crm.required };
  const { data, error } = await supabase
    .from("deals")
    .insert({
      ...fields,
      stage_id: fields.stage_id,
      owner_id: fields.owner_id ?? user.id,
      workspace_id: workspace.id,
      created_by: user.id,
      position: Date.now(),
    })
    .select("id")
    .single();
  if (error) return { error: await errorText(error) };
  revalidatePath("/app/salg");
  await flash("created");
  redirect(back(formData, `/app/salg/${data.id}`));
}

export async function updateDeal(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();
  const dealId = id(formData.get("id"));
  const fields = { ...dealFields(formData), custom: await customFrom(ctx, "deal", formData) };
  if (!dealId || !fields.title || !fields.stage_id) return { error: t.crm.required };
  const { error } = await supabase
    .from("deals")
    .update({ ...fields, stage_id: fields.stage_id, lost_reason: opt(formData.get("lost_reason"), 500) })
    .eq("id", dealId)
    .eq("workspace_id", workspace.id);
  if (error) return { error: await errorText(error) };
  revalidatePath(`/app/salg/${dealId}`);
  revalidatePath("/app/salg");
  return { ok: true };
}

/** Kanban drag & drop and won/lost buttons. */
export async function moveDeal(dealId: string, stageId: string, position: number) {
  const { supabase, workspace } = await requireWorkspace();
  if (!uuid.test(dealId) || !uuid.test(stageId) || !Number.isFinite(position)) return { ok: false };
  const { error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, position })
    .eq("id", dealId)
    .eq("workspace_id", workspace.id);
  revalidatePath("/app/salg");
  revalidatePath(`/app/salg/${dealId}`);
  return { ok: !error };
}

export async function setDealStage(formData: FormData) {
  const dealId = id(formData.get("id"));
  const stageId = id(formData.get("stage_id"));
  if (!dealId || !stageId) return;
  await moveDeal(dealId, stageId, Date.now());
  const { supabase, workspace } = await requireWorkspace();
  const reason = opt(formData.get("lost_reason"), 500);
  if (reason) await supabase.from("deals").update({ lost_reason: reason }).eq("id", dealId).eq("workspace_id", workspace.id);
}

// ---------------------------------------------------------------- tasks
export async function createTask(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  if (!title) return { error: t.crm.required };
  const due = String(formData.get("due") ?? "");
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspace.id,
      title,
      due_at: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(due) ? new Date(due.length === 10 ? `${due}T09:00` : due).toISOString() : null,
      assignee_id: id(formData.get("assignee_id")) ?? user.id,
      company_id: id(formData.get("company_id")),
      contact_id: id(formData.get("contact_id")),
      deal_id: id(formData.get("deal_id")),
      project_id: id(formData.get("project_id")),
      created_by: user.id,
    })
    .select("id, assignee_id, due_at, project_id")
    .single();
  if (error) return { error: await errorText(error) };
  after(() =>
    notifyAssignment(supabase, {
      kind: "task",
      recipientId: data.assignee_id,
      actorId: user.id,
      workspaceName: workspace.name,
      title,
      dueAt: data.due_at,
      path: `/app/oppgaver/${data.id}`,
    }),
  );
  revalidatePath(back(formData, "/app/oppgaver"));
  revalidatePath("/app");
  if (data.project_id) revalidatePath(`/app/prosjekter/${data.project_id}`);
  return { ok: true };
}

/** Hands a task over to another colleague (or back to yourself). */
export async function reassignTask(formData: FormData) {
  const { supabase, user, workspace } = await requireWorkspace();
  const taskId = id(formData.get("id"));
  const assigneeId = id(formData.get("assignee_id"));
  if (taskId && assigneeId) {
    const { data: before } = await supabase
      .from("tasks")
      .select("assignee_id")
      .eq("id", taskId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    const { data } = await supabase
      .from("tasks")
      .update({ assignee_id: assigneeId })
      .eq("id", taskId)
      .eq("workspace_id", workspace.id)
      .select("title, due_at, done_at")
      .maybeSingle();
    if (data && before?.assignee_id !== assigneeId) {
      await supabase.from("task_members").delete().eq("task_id", taskId).eq("user_id", assigneeId);
    }
    if (data && !data.done_at && before?.assignee_id !== assigneeId) {
      after(() =>
        notifyAssignment(supabase, {
          kind: "task",
          recipientId: assigneeId,
          actorId: user.id,
          workspaceName: workspace.name,
          title: data.title,
          dueAt: data.due_at,
          path: `/app/oppgaver/${taskId}`,
        }),
      );
    }
  }
  revalidatePath(back(formData, "/app/oppgaver"));
  revalidatePath("/app");
}

export async function toggleTask(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const taskId = id(formData.get("id"));
  const done = formData.get("done") === "true";
  if (taskId) {
    await supabase
      .from("tasks")
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq("id", taskId)
      .eq("workspace_id", workspace.id);
  }
  revalidatePath(back(formData, "/app/oppgaver"));
  revalidatePath("/app");
}

// ---------------------------------------------------------------- notes / activities
export async function addNote(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const body = String(formData.get("body") ?? "").trim().slice(0, 10000);
  const type = String(formData.get("type") ?? "note");
  if (!body) return { error: t.crm.required };
  const { error } = await supabase.from("activities").insert({
    workspace_id: workspace.id,
    type: NOTE_TYPES.includes(type) ? type : "note",
    body,
    company_id: id(formData.get("company_id")),
    contact_id: id(formData.get("contact_id")),
    deal_id: id(formData.get("deal_id")),
    author_id: user.id,
  });
  if (error) return { error: await errorText(error) };
  revalidatePath(back(formData, "/app"));
  return { ok: true };
}

