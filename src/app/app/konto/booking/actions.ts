"use server";

import { revalidatePath } from "next/cache";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DURATIONS = [15, 20, 30, 45, 60, 90];

/** Creates or updates the signed-in user's booking page in the current company. */
export async function saveBookingPage(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const b = t.booking;
  const num = (k: string, min: number, max: number, def: number) => {
    const n = Math.round(Number(formData.get(k)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const dayStart = String(formData.get("day_start") ?? "");
  const dayEnd = String(formData.get("day_end") ?? "");
  const duration = Number(formData.get("duration_min"));
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((d) => d >= 1 && d <= 7);
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(slug) || !TIME.test(dayStart) || !TIME.test(dayEnd) || dayEnd <= dayStart || !DURATIONS.includes(duration) || weekdays.length === 0) {
    return { error: b.invalid };
  }
  const row = {
    workspace_id: workspace.id,
    user_id: user.id,
    slug,
    title: String(formData.get("title") ?? "").trim().slice(0, 100) || "Møte",
    intro: String(formData.get("intro") ?? "").trim().slice(0, 1000) || null,
    location: String(formData.get("location") ?? "").trim().slice(0, 300) || null,
    duration_min: duration,
    weekdays: [...new Set(weekdays)].sort(),
    day_start: dayStart,
    day_end: dayEnd,
    buffer_min: num("buffer_min", 0, 60, 0),
    notice_hours: num("notice_hours", 0, 336, 12),
    days_ahead: num("days_ahead", 1, 120, 30),
    active: formData.get("active") === "1",
  };
  const { error } = await supabase.from("booking_pages").upsert(row, { onConflict: "workspace_id,user_id" });
  if (error) {
    if (error.code === "23505") return { error: b.slugTaken };
    console.error("booking page save failed", error.message);
    return { error: b.invalid };
  }
  revalidatePath("/app/konto/booking");
  return { ok: true, message: b.saved };
}
