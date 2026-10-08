import "server-only";
import { FikenError } from "@/lib/fiken";
import { seal } from "@/lib/secret-box";
import type { requireWorkspace } from "@/lib/session";
import { syncFiken } from "./fiken-sync";
import { syncPowerOffice, verifyPowerOffice } from "./poweroffice-sync";
import { syncTripletex } from "./tripletex-sync";

export type Provider = "tripletex" | "fiken" | "poweroffice";
export const isProvider = (p: string): p is Provider => p === "tripletex" || p === "fiken" || p === "poweroffice";
type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;


/** Fiken answers 403 when the company lacks Fiken's API add-on (or the app lost access to it). */
export const isFiken403 = (e: unknown) => e instanceof FikenError && e.status === 403;

/** Runs one provider's sync, guarded so two syncs of the same company never overlap. */
export async function runSync(ctx: Ctx, provider: Provider) {
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

/**
 * Checks a PowerOffice client key, stores it (encrypted) and runs the first sync.
 * Used both when the key is pasted and when it comes from the one-click onboarding.
 */
export async function savePowerOfficeKey(ctx: Ctx, key: string) {
  const company = await verifyPowerOffice(key);
  const { error } = await ctx.supabase.rpc("save_integration", {
    p_workspace: ctx.workspace.id,
    p_provider: "poweroffice",
    p_credentials: seal(key),
    p_company: company,
  });
  if (error) throw new Error("save_failed");
  const sync = await runSync(ctx, "poweroffice");
  return { company, sync };
}
