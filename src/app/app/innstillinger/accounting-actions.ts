"use server";

import { revalidatePath } from "next/cache";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { syncTripletex, verifyTripletex, type SyncResult } from "@/lib/accounting/tripletex-sync";
import { getI18n } from "@/lib/i18n/server";
import { canEncrypt, seal } from "@/lib/secret-box";
import { canManage, requireWorkspace } from "@/lib/session";

export type AccountingState = { ok?: boolean; error?: string; message?: string };

const STALE_MS = 6 * 3600 * 1000;

async function access() {
  const ctx = await requireWorkspace();
  const { data } = await ctx.supabase.from("workspaces").select("plan, accounting_addon").eq("id", ctx.workspace.id).single();
  return { ctx, allowed: !!data && hasAccountingAccess(data) };
}

function summary(r: SyncResult, tpl: string) {
  return tpl
    .replace("{companies}", String(r.companiesCreated))
    .replace("{linked}", String(r.companiesLinked))
    .replace("{contacts}", String(r.contactsCreated))
    .replace("{invoices}", String(r.invoices))
    .replace("{tasks}", String(r.tasksCreated));
}

async function runSync(ctx: Awaited<ReturnType<typeof requireWorkspace>>) {
  const { data: claimed } = await ctx.supabase.rpc("integration_claim_sync", { p_workspace: ctx.workspace.id, p_provider: "tripletex" });
  if (!claimed) return { ok: false as const, message: "busy" };
  try {
    const r = await syncTripletex(ctx.supabase, ctx.workspace.id, ctx.user.id);
    await ctx.supabase.rpc("integration_synced", { p_workspace: ctx.workspace.id, p_provider: "tripletex", p_error: null });
    return { ok: true as const, result: r };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("tripletex sync failed", message);
    await ctx.supabase.rpc("integration_synced", { p_workspace: ctx.workspace.id, p_provider: "tripletex", p_error: message });
    return { ok: false as const, message };
  }
}

export async function connectTripletex(_prev: AccountingState, formData: FormData): Promise<AccountingState> {
  const { ctx, allowed } = await access();
  const { t } = await getI18n();
  const a = t.accounting;
  if (!canManage(ctx.workspace.role)) return { error: a.onlyAdmins };
  if (!allowed) return { error: a.notIncluded };
  if (!canEncrypt() || !process.env.TRIPLETEX_CONSUMER_TOKEN) return { error: a.notReady };
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 20 || token.length > 2000 || /\s/.test(token)) return { error: a.badToken };

  let company: string;
  try {
    company = await verifyTripletex(token);
  } catch {
    return { error: a.badToken };
  }
  const { error } = await ctx.supabase.rpc("save_integration", {
    p_workspace: ctx.workspace.id,
    p_provider: "tripletex",
    p_credentials: seal(token),
    p_company: company,
  });
  if (error) return { error: a.failed };

  const sync = await runSync(ctx);
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/bedrifter");
  if (!sync.ok) return { ok: true, message: a.connectedSyncFailed.replace("{company}", company) };
  return { ok: true, message: `${a.connected.replace("{company}", company)} ${summary(sync.result, a.syncSummary)}` };
}

export async function syncAccountingNow(): Promise<AccountingState> {
  const { ctx, allowed } = await access();
  const { t } = await getI18n();
  if (!allowed) return { error: t.accounting.notIncluded };
  const sync = await runSync(ctx);
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/bedrifter");
  revalidatePath("/app/oppgaver");
  return sync.ok ? { ok: true, message: summary(sync.result, t.accounting.syncSummary) } : { error: t.accounting.syncFailed };
}

/** Called quietly from the app when the last sync is older than 6 hours. */
export async function autoSyncAccounting(): Promise<boolean> {
  const { ctx, allowed } = await access();
  if (!allowed) return false;
  const { data } = await ctx.supabase
    .from("integrations")
    .select("last_sync_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("provider", "tripletex")
    .maybeSingle();
  if (!data) return false;
  if (data.last_sync_at && Date.now() - new Date(data.last_sync_at).getTime() < STALE_MS) return false;
  const sync = await runSync(ctx);
  return sync.ok;
}

export async function disconnectTripletex() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) return;
  await ctx.supabase.from("integrations").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "tripletex");
  await ctx.supabase.from("external_invoices").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "tripletex");
  revalidatePath("/app/innstillinger");
}
