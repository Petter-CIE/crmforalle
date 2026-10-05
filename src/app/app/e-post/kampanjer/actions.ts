"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brevoEnabled, sendBrevo } from "@/lib/brevo";
import { renderCampaign } from "@/lib/campaign-render";
import type { Json } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { SITE_URL } from "@/lib/site-url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Audience = { kind?: "b2b" | "b2c" | ""; project_id?: string; owner_id?: string; consent_only?: boolean };
export type CampaignState = { ok?: boolean; error?: string; message?: string };

async function manager() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) throw new Error("forbidden");
  return ctx;
}

/** Only known keys with valid values reach the database. */
function cleanAudience(a: Audience): Audience {
  return {
    kind: a.kind === "b2b" || a.kind === "b2c" ? a.kind : "",
    project_id: a.project_id && UUID.test(a.project_id) ? a.project_id : "",
    owner_id: a.owner_id && UUID.test(a.owner_id) ? a.owner_id : "",
    consent_only: a.consent_only === true,
  };
}

function audienceFrom(formData: FormData): Audience {
  return cleanAudience({
    kind: String(formData.get("kind") ?? "") as Audience["kind"],
    project_id: String(formData.get("project_id") ?? ""),
    owner_id: String(formData.get("owner_id") ?? ""),
    consent_only: formData.get("consent_only") === "1",
  });
}

export async function createCampaign() {
  const { supabase, user, workspace } = await manager();
  const { t } = await getI18n();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({ workspace_id: workspace.id, name: t.campaigns.newName, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  redirect(`/app/e-post/kampanjer/${data.id}`);
}

async function save(formData: FormData) {
  const { supabase, workspace } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("bad id");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const { error } = await supabase
    .from("campaigns")
    .update({
      name: name || "—",
      subject: String(formData.get("subject") ?? "").slice(0, 200),
      body: String(formData.get("body") ?? "").slice(0, 20000),
      audience: audienceFrom(formData) as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  return { supabase, workspace, id };
}

export async function saveCampaign(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const { t } = await getI18n();
  try {
    await save(formData);
    revalidatePath("/app/e-post/kampanjer");
    return { ok: true, message: t.campaigns.saved };
  } catch {
    return { error: t.campaigns.errFailed };
  }
}

/** How many would receive it with this selection, and the quota left this month. */
export async function previewAudience(a: Audience): Promise<{ count: number; quota: number; used: number } | null> {
  const { supabase, workspace } = await manager();
  const { data, error } = await supabase.rpc("campaign_preview", { p_workspace: workspace.id, p_audience: cleanAudience(a) as unknown as Json });
  if (error || !data) return null;
  return data as unknown as { count: number; quota: number; used: number };
}

/** Saves and sends the campaign to the signed-in user only, filled in with their own name. */
export async function sendTestCampaign(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const { t } = await getI18n();
  const c = t.campaigns;
  if (!brevoEnabled()) return { error: c.notConfigured };
  try {
    const { supabase, workspace } = await save(formData);
    const { data: auth } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("full_name, email").eq("id", auth.user?.id ?? "").single();
    const { data: ws } = await supabase.from("workspaces").select("name, quote_address").eq("id", workspace.id).single();
    if (!me?.email || !ws) return { error: c.errFailed };
    const subject = String(formData.get("subject") ?? "");
    const body = String(formData.get("body") ?? "");
    if (!subject.trim() || !body.trim()) return { error: c.errIncomplete };
    const [first, ...rest] = (me.full_name ?? "").split(" ");
    const mail = renderCampaign(
      subject,
      body,
      { first_name: first, last_name: rest.join(" "), company_name: ws.name },
      { company: ws.name, address: ws.quote_address, unsubscribeUrl: `${SITE_URL}/avmelding/test`, unsubscribeLabel: "Meld deg av", why: "Du får denne e-posten fra" },
    );
    await sendBrevo({ to: me.email, toName: me.full_name, fromName: ws.name, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text });
    return { ok: true, message: c.testSent(me.email) };
  } catch (e) {
    console.error("campaign test failed", e instanceof Error ? e.message : e);
    return { error: c.errFailed };
  }
}

export async function sendCampaign(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const { t } = await getI18n();
  const c = t.campaigns;
  if (!brevoEnabled()) return { error: c.notConfigured };
  let id: string;
  try {
    const saved = await save(formData);
    id = saved.id;
    const { data, error } = await saved.supabase.rpc("campaign_send", { p_campaign: id });
    if (error || !data) return { error: c.errFailed };
    const r = data as unknown as { ok?: boolean; count?: number; left?: number; error?: string };
    if (r.error === "empty") return { error: c.errEmpty };
    if (r.error === "quota") return { error: c.errQuota(r.count ?? 0, r.left ?? 0) };
    if (r.error === "incomplete") return { error: c.errIncomplete };
    if (r.error === "read_only") return { error: c.errReadOnly };
    if (r.error === "not_draft") return { error: c.errNotDraft };
    if (!r.ok) return { error: c.errFailed };
  } catch {
    return { error: c.errFailed };
  }
  revalidatePath("/app/e-post/kampanjer");
  redirect(`/app/e-post/kampanjer/${id}?sendt=1`);
}

export async function cancelCampaign(formData: FormData) {
  const { supabase } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  await supabase.rpc("campaign_cancel", { p_campaign: id });
  revalidatePath(`/app/e-post/kampanjer/${id}`);
}

export async function deleteCampaign(formData: FormData) {
  const { supabase, workspace } = await manager();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  await supabase.from("campaigns").delete().eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/e-post/kampanjer");
  redirect("/app/e-post/kampanjer");
}
