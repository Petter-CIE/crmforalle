"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import { opt } from "@/lib/crm";
import { CUSTOM_ENTITIES, CUSTOM_TYPES, MAX_FIELDS_PER_ENTITY, type CustomEntity, type CustomType } from "@/lib/custom-fields";
import { getI18n } from "@/lib/i18n/server";
import { flash } from "@/lib/flash";
import { canManage, requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function manager() {
  const ctx = await requireWorkspace();
  const { t } = await getI18n();
  return { ctx, t, allowed: canManage(ctx.workspace.role) };
}

// ---------------------------------------------------------------- custom fields
export async function createCustomField(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  const c = t.customize;
  if (!allowed) return { error: c.onlyAdmins };
  const entity = String(formData.get("entity")) as CustomEntity;
  const type = String(formData.get("type")) as CustomType;
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  if (!CUSTOM_ENTITIES.includes(entity) || !CUSTOM_TYPES.includes(type) || !label) return { error: t.crm.required };
  const options =
    type === "select"
      ? [...new Set(String(formData.get("options") ?? "").split(/[\n,;]/).map((o) => o.trim().slice(0, 100)).filter(Boolean))].slice(0, 50)
      : [];
  if (type === "select" && options.length === 0) return { error: c.optionsRequired };

  const { count } = await ctx.supabase
    .from("custom_fields")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspace.id)
    .eq("entity", entity);
  if ((count ?? 0) >= MAX_FIELDS_PER_ENTITY) return { error: c.tooMany(MAX_FIELDS_PER_ENTITY) };

  const { error } = await ctx.supabase
    .from("custom_fields")
    .insert({ workspace_id: ctx.workspace.id, entity, type, label, options, position: Date.now() });
  if (error) return { error: t.crm.error };
  revalidatePath("/app/innstillinger/felt");
  return { ok: true };
}

export async function deleteCustomField(formData: FormData) {
  const { ctx, allowed } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!allowed || !UUID.test(id)) return;
  await ctx.supabase.from("custom_fields").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath("/app/innstillinger/felt");
}

/** Moves a field one step up or down within its entity. */
export async function moveCustomField(formData: FormData) {
  const { ctx, allowed } = await manager();
  const id = String(formData.get("id") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  if (!allowed || !UUID.test(id)) return;
  const { data: me } = await ctx.supabase.from("custom_fields").select("entity").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle();
  if (!me) return;
  const { data: list } = await ctx.supabase
    .from("custom_fields")
    .select("id, position")
    .eq("workspace_id", ctx.workspace.id)
    .eq("entity", me.entity)
    .order("position")
    .order("created_at");
  const rows = list ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  // Renumber so equal positions can't block the swap.
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await Promise.all(rows.map((r, k) => ctx.supabase.from("custom_fields").update({ position: k }).eq("id", r.id).eq("workspace_id", ctx.workspace.id)));
  revalidatePath("/app/innstillinger/felt");
}

// ---------------------------------------------------------------- automations
export async function createAutomation(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  if (!allowed) return { error: t.customize.onlyAdmins };
  const stageId = String(formData.get("stage_id") ?? "");
  const title = String(formData.get("task_title") ?? "").trim().slice(0, 200);
  const days = Math.round(Number(formData.get("due_days")));
  if (!UUID.test(stageId) || !title || !Number.isFinite(days) || days < 0 || days > 365) return { error: t.crm.required };
  const { error } = await ctx.supabase
    .from("automations")
    .insert({ workspace_id: ctx.workspace.id, stage_id: stageId, task_title: title, due_days: days, created_by: ctx.user.id });
  if (error) return { error: t.crm.error };
  revalidatePath("/app/innstillinger/automatisering");
  return { ok: true };
}

export async function toggleAutomation(formData: FormData) {
  const { ctx, allowed } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!allowed || !UUID.test(id)) return;
  await ctx.supabase
    .from("automations")
    .update({ active: formData.get("active") === "1" })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  revalidatePath("/app/innstillinger/automatisering");
}

export async function deleteAutomation(formData: FormData) {
  const { ctx, allowed } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!allowed || !UUID.test(id)) return;
  await ctx.supabase.from("automations").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath("/app/innstillinger/automatisering");
}

// ---------------------------------------------------------------- quote settings
export async function saveQuoteSettings(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  if (!allowed) return { error: t.customize.onlyAdmins };
  const days = Math.round(Number(formData.get("quote_valid_days")));
  const { error } = await ctx.supabase
    .from("workspaces")
    .update({
      quote_address: opt(formData.get("quote_address"), 300),
      quote_email: opt(formData.get("quote_email"), 200),
      quote_phone: opt(formData.get("quote_phone"), 50),
      quote_bank_account: opt(formData.get("quote_bank_account"), 50),
      quote_terms: opt(formData.get("quote_terms"), 5000),
      quote_valid_days: Number.isFinite(days) && days >= 1 && days <= 365 ? days : 30,
    })
    .eq("id", ctx.workspace.id);
  if (error) return { error: t.crm.error };
  revalidatePath("/app/tilbud");
  return { ok: true };
}

// ---------------------------------------------------------------- pipeline stages
export type StageInput = { id: string | null; name: string; probability: number; kind: "open" | "won" | "lost" };
/** moveTo = index in the saved list (open stages, then won, then lost) of the stage that takes over the deals. */
export type StageRemoval = { id: string; moveTo: number | null };

/**
 * Saves the whole pipeline at once: names, probabilities and order (open stages first, then won and lost),
 * new stages and deleted ones. Deals in a deleted stage are moved to the chosen stage first.
 */
export async function saveStages(pipelineId: string, stages: StageInput[], removals: StageRemoval[]): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  const st = t.customize.stages;
  if (!allowed) return { error: t.customize.onlyAdmins };
  const { supabase, workspace } = ctx;
  const ws = workspace.id;
  if (!UUID.test(pipelineId)) return { error: t.crm.error };

  const { data: existing } = await supabase.from("pipeline_stages").select("id, is_won, is_lost").eq("workspace_id", ws).eq("pipeline_id", pipelineId);
  const byId = new Map((existing ?? []).map((s) => [s.id, s]));
  const clean = stages.map((s) => ({ ...s, name: String(s.name ?? "").trim(), probability: Math.round(Number(s.probability)) }));
  if (clean.some((s) => !s.name || s.name.length > 60 || !Number.isFinite(s.probability) || s.probability < 0 || s.probability > 100)) return { error: st.invalid };
  const open = clean.filter((s) => s.kind === "open");
  const won = clean.find((s) => s.kind === "won");
  const lost = clean.find((s) => s.kind === "lost");
  if (open.length === 0) return { error: st.needOpen };
  if (open.length > 20) return { error: st.invalid };
  // Won/lost must be the existing ones; open stages must be new or existing open ones.
  if (!won?.id || !byId.get(won.id)?.is_won || !lost?.id || !byId.get(lost.id)?.is_lost) return { error: t.crm.error };
  for (const s of open) if (s.id && (!UUID.test(s.id) || !byId.has(s.id) || byId.get(s.id)!.is_won || byId.get(s.id)!.is_lost)) return { error: t.crm.error };
  const keep = new Set(clean.map((s) => s.id).filter(Boolean));
  for (const r of removals) {
    const s = byId.get(r.id);
    if (!s || s.is_won || s.is_lost || keep.has(r.id)) return { error: t.crm.error };
  }

  // 1) Create new stages and update existing ones in the new order.
  // The client sends the list in this order already; moveTo indexes refer to it.
  const ordered = [...open, won, lost];
  const ids: string[] = [];
  for (const [position, s] of ordered.entries()) {
    if (s.id) {
      const { error } = await supabase.from("pipeline_stages").update({ name: s.name, probability: s.probability, position }).eq("id", s.id).eq("workspace_id", ws);
      if (error) return { error: t.crm.error };
      ids.push(s.id);
    } else {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({ workspace_id: ws, pipeline_id: pipelineId, name: s.name, probability: s.probability, position })
        .select("id")
        .single();
      if (error || !data) return { error: t.crm.error };
      ids.push(data.id);
    }
  }

  // 2) Delete removed stages, moving their deals first (to the chosen stage, or the first open one).
  for (const r of removals) {
    const target = typeof r.moveTo === "number" && ids[r.moveTo] ? ids[r.moveTo] : ids[0];
    const { error: moveErr } = await supabase.from("deals").update({ stage_id: target }).eq("stage_id", r.id).eq("workspace_id", ws);
    if (moveErr) return { error: t.crm.error };
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", r.id).eq("workspace_id", ws);
    if (error) return { error: t.crm.error };
  }

  revalidatePath("/app", "layout");
  return { ok: true, message: st.saved };
}

// ---------------------------------------------------------------- pipelines
const MAX_PIPELINES = 10;

/** New pipeline with a few starting stages plus its own "won" and "lost". */
export async function createPipeline(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  const pl = t.pipelines;
  if (!allowed) return { error: t.customize.onlyAdmins };
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 60) return { error: pl.invalidName };
  const { supabase, workspace } = ctx;
  const { data: list } = await supabase.from("pipelines").select("position").eq("workspace_id", workspace.id);
  if ((list ?? []).length >= MAX_PIPELINES) return { error: pl.tooMany };
  const position = Math.max(-1, ...(list ?? []).map((p) => p.position)) + 1;
  const { data: created, error } = await supabase.from("pipelines").insert({ workspace_id: workspace.id, name, position }).select("id").single();
  if (error || !created) return { error: t.crm.error };
  const probs = [10, 40, 70];
  const rows = [
    ...pl.defaultStages.map((n, i) => ({ name: n, probability: probs[i] ?? 50, is_won: false, is_lost: false })),
    { name: pl.won, probability: 100, is_won: true, is_lost: false },
    { name: pl.lost, probability: 0, is_won: false, is_lost: true },
  ].map((r, position) => ({ ...r, position, workspace_id: workspace.id, pipeline_id: created.id }));
  const { error: stageErr } = await supabase.from("pipeline_stages").insert(rows);
  if (stageErr) return { error: t.crm.error };
  revalidatePath("/app", "layout");
  await flash("saved");
  redirect(`/app/innstillinger/salgsfaser?pipeline=${created.id}`);
}

export async function renamePipeline(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  const pl = t.pipelines;
  if (!allowed) return { error: t.customize.onlyAdmins };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!UUID.test(id)) return { error: t.crm.error };
  if (!name || name.length > 60) return { error: pl.invalidName };
  const { error } = await ctx.supabase.from("pipelines").update({ name }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return { error: t.crm.error };
  revalidatePath("/app", "layout");
  return { ok: true, message: pl.renamed };
}

/** Deletes a pipeline after moving its deals to the first open stage of another pipeline. */
export async function deletePipeline(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  const pl = t.pipelines;
  if (!allowed) return { error: t.customize.onlyAdmins };
  const id = String(formData.get("id") ?? "");
  const target = String(formData.get("move_to") ?? "");
  if (!UUID.test(id) || !UUID.test(target) || id === target) return { error: t.crm.error };
  const { supabase, workspace } = ctx;
  const ws = workspace.id;
  const { data: list } = await supabase.from("pipelines").select("id").eq("workspace_id", ws);
  if ((list ?? []).length < 2) return { error: pl.cannotDeleteLast };
  if (!(list ?? []).some((p) => p.id === target) || !(list ?? []).some((p) => p.id === id)) return { error: t.crm.error };
  const [{ data: from }, { data: to }] = await Promise.all([
    supabase.from("pipeline_stages").select("id").eq("workspace_id", ws).eq("pipeline_id", id),
    supabase.from("pipeline_stages").select("id").eq("workspace_id", ws).eq("pipeline_id", target).eq("is_won", false).eq("is_lost", false).order("position").limit(1),
  ]);
  const dest = to?.[0]?.id;
  if (!dest) return { error: t.crm.error };
  const ids = (from ?? []).map((s) => s.id);
  if (ids.length) {
    const { error: moveErr } = await supabase.from("deals").update({ stage_id: dest }).eq("workspace_id", ws).in("stage_id", ids);
    if (moveErr) return { error: t.crm.error };
  }
  const { error } = await supabase.from("pipelines").delete().eq("id", id).eq("workspace_id", ws);
  if (error) return { error: t.crm.error };
  revalidatePath("/app", "layout");
  await flash("saved");
  redirect(`/app/innstillinger/salgsfaser?pipeline=${target}`);
}

// ---------------------------------------------------------------- web forms
function leadFields(formData: FormData) {
  const text = (k: string, max: number) => opt(formData.get(k), max);
  const ownerId = String(formData.get("owner_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 80),
    owner_id: UUID.test(ownerId) ? ownerId : null,
    project_id: UUID.test(projectId) ? projectId : null,
    create_deal: formData.get("create_deal") === "1",
    create_task: formData.get("create_task") === "1",
    ask_phone: formData.get("ask_phone") === "1",
    ask_company: formData.get("ask_company") === "1",
    require_message: formData.get("require_message") === "1",
    title: text("title", 120),
    intro: text("intro", 1000),
    button_text: text("button_text", 40),
    thank_you: text("thank_you", 1000),
  };
}

export async function createLeadForm(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  if (!allowed) return { error: t.leads.onlyAdmins };
  const f = leadFields(formData);
  if (!f.name) return { error: t.crm.required };
  const { data, error } = await ctx.supabase
    .from("lead_forms")
    .insert({ ...f, owner_id: f.owner_id ?? ctx.user.id, workspace_id: ctx.workspace.id, created_by: ctx.user.id })
    .select("id")
    .single();
  if (error || !data) return { error: t.crm.error };
  await flash("created");
  redirect(`/app/innstillinger/skjema/${data.id}`);
}

export async function updateLeadForm(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { ctx, t, allowed } = await manager();
  if (!allowed) return { error: t.leads.onlyAdmins };
  const id = String(formData.get("id") ?? "");
  const f = leadFields(formData);
  if (!UUID.test(id) || !f.name) return { error: t.crm.required };
  const { error } = await ctx.supabase
    .from("lead_forms")
    .update({ ...f, active: formData.get("active") === "1" })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { error: t.crm.error };
  revalidatePath("/app/innstillinger/skjema");
  return { ok: true, message: t.leads.saved };
}

export async function deleteLeadForm(formData: FormData) {
  const { ctx, allowed } = await manager();
  const id = String(formData.get("id") ?? "");
  if (allowed && UUID.test(id)) await ctx.supabase.from("lead_forms").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath("/app/innstillinger/skjema");
  redirect("/app/innstillinger/skjema");
}
