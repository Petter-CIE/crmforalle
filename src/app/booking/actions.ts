"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getI18n } from "@/lib/i18n/server";
import { sendBookingCancelled, sendBookingMails } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

export type BookResult = { ok?: boolean; token?: string; error?: string };

type Created = {
  id: string;
  cancel_token: string;
  starts_at: string;
  ends_at: string;
  title: string;
  location: string | null;
  company: string;
  task_id: string | null;
  host_name: string;
  host_email: string | null;
  host_locale: string | null;
};

/** Books a meeting from the public page. The database checks the time again. */
export async function bookMeeting(slug: string, start: string, form: { name: string; email: string; phone: string; company: string; message: string; website?: string }): Promise<BookResult> {
  const { t, locale } = await getI18n();
  const b = t.booking;
  // Honeypot: bots fill every field.
  if (form.website) return { ok: true, token: "" };
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(slug) || Number.isNaN(Date.parse(start))) return { error: b.failed };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const supabase = await createClient();
  const data = { name: form.name.slice(0, 120), email: form.email.slice(0, 200), phone: form.phone.slice(0, 50), company: form.company.slice(0, 200), message: form.message.slice(0, 2000) };
  const { data: res, error } = await supabase.rpc("booking_create", { p_slug: slug, p_start: new Date(start).toISOString(), p_data: data, p_ip: ip });
  if (error) {
    if (error.message.includes("slot_unavailable")) return { error: b.taken };
    if (error.message.includes("rate_limited")) return { error: b.rateLimited };
    if (error.message.includes("invalid")) return { error: b.invalid };
    console.error("booking_create failed", error.message);
    return { error: b.failed };
  }
  const c = res as unknown as Created;
  after(() =>
    sendBookingMails({
      id: c.id,
      cancelToken: c.cancel_token,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      title: c.title,
      location: c.location,
      company: c.company,
      hostName: c.host_name,
      hostEmail: c.host_email,
      hostLocale: c.host_locale,
      guestName: data.name,
      guestEmail: data.email,
      guestPhone: data.phone || null,
      guestCompany: data.company || null,
      message: data.message || null,
      guestLocale: locale === "en" ? "en" : "nb",
      taskId: c.task_id,
    }),
  );
  return { ok: true, token: c.cancel_token };
}

/** Cancels from the link in the confirmation e-mail. */
export async function cancelBooking(token: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f]{40}$/.test(token)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booking_cancel", { p_token: token });
  if (error || !data) return { ok: false };
  const d = data as { starts_at: string; name: string; email: string; host_email: string | null; host_locale: string | null };
  after(() => sendBookingCancelled({ startsAt: d.starts_at, guestName: d.name, guestEmail: d.email, hostEmail: d.host_email, hostLocale: d.host_locale }));
  return { ok: true };
}
