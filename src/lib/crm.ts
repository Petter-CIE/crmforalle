import "server-only";
import type { requireWorkspace } from "@/lib/session";

type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;

export function formatMoney(value: number, dateLocale: string) {
  return new Intl.NumberFormat(dateLocale, { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null | undefined, dateLocale: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string, dateLocale: string) {
  return new Date(value).toLocaleString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function contactName(c: { first_name: string; last_name: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

/** Members of the current workspace as {id, name} for owner/assignee pickers. */
export async function listMembers(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("members")
    .select("user_id, profiles(full_name, email)")
    .eq("workspace_id", ctx.workspace.id);
  return (data ?? []).map((m) => ({ id: m.user_id, name: m.profiles?.full_name || m.profiles?.email || "?" }));
}

/** Postgres error → friendly message key. */
export function dbErrorKey(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.message?.includes("contact_limit_reached")) return "limit" as const;
  if (error.code === "23505") return "duplicate" as const;
  return "error" as const;
}

/** Normalises an optional text input to null. */
export function opt(v: FormDataEntryValue | null, max = 500) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

export { PROJECT_COLORS, type ProjectColor } from "@/lib/colors";

/**
 * PostgREST `or` filter for tasks a person works on: assigned to them or added as a collaborator.
 * Usage: query.or(await involvedFilter(ctx, userId))
 */
export async function involvedFilter(ctx: Ctx, userId: string) {
  const { data } = await ctx.supabase
    .from("task_members")
    .select("task_id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId)
    .limit(1000);
  const ids = (data ?? []).map((r) => r.task_id);
  return ids.length > 0 ? `assignee_id.eq.${userId},id.in.(${ids.join(",")})` : `assignee_id.eq.${userId}`;
}
