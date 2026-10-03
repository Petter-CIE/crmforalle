"use server";

import { revalidatePath } from "next/cache";
import type { FormResult } from "@/app/app/crm-actions";
import { opt } from "@/lib/crm";
import { CUSTOM_ENTITIES, CUSTOM_TYPES, MAX_FIELDS_PER_ENTITY, type CustomEntity, type CustomType } from "@/lib/custom-fields";
import { getI18n } from "@/lib/i18n/server";
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
