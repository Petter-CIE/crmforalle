"use server";

import { revalidatePath } from "next/cache";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { fikenCredentials, syncFiken } from "@/lib/accounting/fiken-sync";
import { syncPowerOffice, verifyPowerOffice } from "@/lib/accounting/poweroffice-sync";
import { syncTripletex, verifyTripletex, type SyncResult } from "@/lib/accounting/tripletex-sync";
import { fikenCompanies, FikenError, fikenRevoke } from "@/lib/fiken";
import { getI18n } from "@/lib/i18n/server";
import { powerOfficeEnabled } from "@/lib/poweroffice";
import { canEncrypt, open, seal } from "@/lib/secret-box";
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

type Provider = "tripletex" | "fiken" | "poweroffice";
const isProvider = (p: string): p is Provider => p === "tripletex" || p === "fiken" || p === "poweroffice";
type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;

/** Fiken answers 403 when the company lacks Fiken's API add-on (or the app lost access to it). */
const isFiken403 = (e: unknown) => e instanceof FikenError && e.status === 403;

async function runSync(ctx: Ctx, provider: Provider) {
  const { data: claimed } = await ctx.supabase.rpc("integration_claim_sync", { p_workspace: ctx.workspace.id, p_provider: provider });
  if (!claimed) return { ok: false as const, message: "busy" };
  try {
    const r =
      provider === "fiken"
        ? await syncFiken(ctx.supabase, ctx.workspace.id, ctx.user.id)
        : provider === "poweroffice"
          ? await syncPowerOffice(ctx.supabase, ctx.workspace.id, ctx.user.id)
          : await syncTripletex(ctx.supabase, ctx.workspace.id, ctx.user.id);
    await ctx.supabase.rpc("integration_synced", { p_workspace: ctx.workspace.id, p_provider: provider, p_error: null });
    return { ok: true as const, result: r };
  } catch (e) {
    const message = isFiken403(e) ? "fiken_403" : e instanceof Error ? e.message : String(e);
    console.error(`${provider} sync failed`, message);
    await ctx.supabase.rpc("integration_synced", { p_workspace: ctx.workspace.id, p_provider: provider, p_error: message });
    return { ok: false as const, message };
  }
}

async function connectedProviders(ctx: Ctx) {
  const { data } = await ctx.supabase.from("integrations").select("provider, last_sync_at").eq("workspace_id", ctx.workspace.id);
  return (data ?? []).filter((r): r is { provider: Provider; last_sync_at: string | null } => isProvider(r.provider));
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
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    console.error("tripletex connect failed", code);
    // 401/403 when creating the session = Tripletex rejected the key itself.
    if (/^tripletex_session_(401|403)$/.test(code)) return { error: a.badToken };
    return { error: a.serviceError.replace("{code}", code.replace(/^tripletex_/, "")) };
  }
  const { error } = await ctx.supabase.rpc("save_integration", {
    p_workspace: ctx.workspace.id,
    p_provider: "tripletex",
    p_credentials: seal(token),
    p_company: company,
  });
  if (error) return { error: a.failed };

  const sync = await runSync(ctx, "tripletex");
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/bedrifter");
  if (!sync.ok) return { ok: true, message: a.connectedSyncFailed.replace("{company}", company) };
  return { ok: true, message: `${a.connected.replace("{company}", company)} ${summary(sync.result, a.syncSummary)}` };
}

export async function connectPowerOffice(_prev: AccountingState, formData: FormData): Promise<AccountingState> {
  const { ctx, allowed } = await access();
  const { t } = await getI18n();
  const a = t.accounting;
  if (!canManage(ctx.workspace.role)) return { error: a.onlyAdmins };
  if (!allowed) return { error: a.notIncluded };
  if (!canEncrypt() || !powerOfficeEnabled()) return { error: a.notReady };
  const key = String(formData.get("clientKey") ?? "").trim();
  if (key.length < 20 || key.length > 200 || /\s/.test(key)) return { error: a.poBadKey };

  let company: string;
  try {
    company = await verifyPowerOffice(key);
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    console.error("poweroffice connect failed", code);
    // 400/401 from the token endpoint = PowerOffice rejected the client key.
    if (/^poweroffice_token_(400|401|403)$/.test(code)) return { error: a.poBadKey };
    if (code.startsWith("poweroffice_privileges:")) return { error: a.poPrivileges };
    return { error: a.poServiceError.replace("{code}", code.replace(/^poweroffice_/, "")) };
  }
  const { error } = await ctx.supabase.rpc("save_integration", {
    p_workspace: ctx.workspace.id,
    p_provider: "poweroffice",
    p_credentials: seal(key),
    p_company: company,
  });
  if (error) return { error: a.failed };

  const sync = await runSync(ctx, "poweroffice");
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/bedrifter");
  if (!sync.ok) return { ok: true, message: a.connectedSyncFailed.replace("{company}", company) };
  return { ok: true, message: `${a.connected.replace("{company}", company)} ${summary(sync.result, a.syncSummary)}` };
}

export async function syncAccountingNow(): Promise<AccountingState> {
  const { ctx, allowed } = await access();
  const { t } = await getI18n();
  if (!allowed) return { error: t.accounting.notIncluded };
  const providers = await connectedProviders(ctx);
  const messages: string[] = [];
  let failed: string | null = null;
  for (const { provider } of providers) {
    const sync = await runSync(ctx, provider);
    if (sync.ok) messages.push(summary(sync.result, t.accounting.syncSummary));
    else failed = sync.message === "fiken_403" ? t.accounting.fikenNoApi : t.accounting.syncFailed;
  }
  revalidatePath("/app/innstillinger");
  revalidatePath("/app/bedrifter");
  revalidatePath("/app/oppgaver");
  return failed ? { error: failed } : { ok: true, message: messages.join(" ") };
}

/** Called quietly from the app when the last sync is older than 6 hours. */
export async function autoSyncAccounting(): Promise<boolean> {
  const { ctx, allowed } = await access();
  if (!allowed) return false;
  let ran = false;
  for (const p of await connectedProviders(ctx)) {
    if (p.last_sync_at && Date.now() - new Date(p.last_sync_at).getTime() < STALE_MS) continue;
    const sync = await runSync(ctx, p.provider);
    ran = ran || sync.ok;
  }
  return ran;
}

/** Owner/admin picks which Fiken company to read from (when their Fiken user has several). */
export async function chooseFikenCompany(_prev: AccountingState, formData: FormData): Promise<AccountingState> {
  const { ctx, allowed } = await access();
  const { t } = await getI18n();
  const a = t.accounting;
  if (!canManage(ctx.workspace.role)) return { error: a.onlyAdmins };
  if (!allowed) return { error: a.notIncluded };
  const slug = String(formData.get("slug") ?? "");
  try {
    const creds = await fikenCredentials(ctx.supabase, ctx.workspace.id);
    const company = (await fikenCompanies(creds.access)).find((c) => c.slug === slug);
    if (!company) return { error: a.failed };
    if (company.hasApiAccess === false) return { error: a.fikenNoApi };
    const { error } = await ctx.supabase.rpc("integration_update_credentials", {
      p_workspace: ctx.workspace.id,
      p_provider: "fiken",
      p_credentials: seal(JSON.stringify({ ...creds, slug: company.slug })),
      p_company: company.name,
    });
    if (error) return { error: a.failed };
    const sync = await runSync(ctx, "fiken");
    revalidatePath("/app/innstillinger");
    revalidatePath("/app/bedrifter");
    if (!sync.ok) return { ok: true, message: sync.message === "fiken_403" ? a.fikenNoApi : a.connectedSyncFailed.replace("{company}", company.name) };
    return { ok: true, message: `${a.connected.replace("{company}", company.name)} ${summary(sync.result, a.syncSummary)}` };
  } catch (e) {
    console.error("fiken choose failed", e instanceof Error ? e.message : e);
    return { error: isFiken403(e) ? a.fikenNoApi : a.failed };
  }
}

export async function disconnectFiken() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) return;
  const { data } = await ctx.supabase.from("integrations").select("credentials").eq("workspace_id", ctx.workspace.id).eq("provider", "fiken").maybeSingle();
  if (data) {
    try {
      await fikenRevoke((JSON.parse(open(data.credentials)) as { access: string }).access);
    } catch {
      // the connection is removed here even if Fiken cannot be reached
    }
  }
  await ctx.supabase.from("integrations").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "fiken");
  await ctx.supabase.from("external_invoices").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "fiken");
  revalidatePath("/app/innstillinger");
}

export async function disconnectPowerOffice() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) return;
  await ctx.supabase.from("integrations").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "poweroffice");
  await ctx.supabase.from("external_invoices").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "poweroffice");
  revalidatePath("/app/innstillinger");
}

export async function disconnectTripletex() {
  const ctx = await requireWorkspace();
  if (!canManage(ctx.workspace.role)) return;
  await ctx.supabase.from("integrations").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "tripletex");
  await ctx.supabase.from("external_invoices").delete().eq("workspace_id", ctx.workspace.id).eq("provider", "tripletex");
  revalidatePath("/app/innstillinger");
}
