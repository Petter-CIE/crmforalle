import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Select } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace, siteUrl } from "@/lib/session";
import { CopyLink } from "./copy-link";
import { saveBookingPage } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.booking.title };
}

/** Suggests an address from the user's name, e.g. "kari-nordmann". */
function suggestSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base.length >= 3 ? base : `mote-${Math.random().toString(36).slice(2, 7)}`;
}

export default async function BookingSettingsPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale, locale } = await getI18n();
  const b = t.booking;
  const [{ data: page }, { data: profile }, { data: upcoming }] = await Promise.all([
    supabase.from("booking_pages").select("*").eq("workspace_id", workspace.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, starts_at, name, email, company, cancelled_at, contact_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(30),
  ]);
  const slug = page?.slug ?? suggestSlug(profile?.full_name || user.email?.split("@")[0] || "");
  const url = `${siteUrl()}/booking/${slug}`;
  const days = page?.weekdays ?? [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <PageHeader title={b.title} subtitle={b.intro} backHref="/app/konto" backLabel={t.security.title} />

      {page && (
        <Card>
          <h2 className="mb-2 font-semibold">{b.yourLink}</h2>
          <CopyLink url={url} active={page.active} t={{ copy: b.copy, copied: b.copied, open: b.open }} />
        </Card>
      )}

      <Card>
        <ActionForm action={saveBookingPage} submitLabel={b.save} pendingLabel={b.saving}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" value="1" defaultChecked={page?.active ?? true} />
            {b.active}
          </label>
          <Field label={b.slug} htmlFor="bk_slug">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted">{siteUrl().replace(/^https?:\/\//, "")}/booking/</span>
              <Input id="bk_slug" name="slug" required defaultValue={slug} pattern="[a-z0-9][a-z0-9\-]{2,40}" className="min-w-0 flex-1" />
            </div>
            <p className="mt-1 text-xs text-muted">{b.slugHelp}</p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={b.meetingTitle} htmlFor="bk_title">
              <Input id="bk_title" name="title" required maxLength={100} defaultValue={page?.title ?? (locale === "en" ? "Meeting" : "Møte")} className="w-full" />
            </Field>
            <Field label={b.duration} htmlFor="bk_dur">
              <Select id="bk_dur" name="duration_min" defaultValue={String(page?.duration_min ?? 30)} className="w-full">
                {[15, 20, 30, 45, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {b.minutes(n)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={b.location} htmlFor="bk_loc">
            <Input id="bk_loc" name="location" maxLength={300} defaultValue={page?.location ?? ""} placeholder={b.locationPlaceholder} className="w-full" />
          </Field>
          <Field label={b.meetingIntro} htmlFor="bk_intro">
            <Textarea id="bk_intro" name="intro" rows={2} maxLength={1000} defaultValue={page?.intro ?? ""} className="w-full" />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{b.days}</legend>
            <div className="flex flex-wrap gap-2">
              {b.weekdays.map((label, i) => (
                <label
                  key={label}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
                >
                  <input type="checkbox" name="weekdays" value={i + 1} defaultChecked={days.includes(i + 1)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-5">
            <Field label={b.from} htmlFor="bk_from">
              <Input id="bk_from" name="day_start" type="time" required defaultValue={(page?.day_start ?? "09:00").slice(0, 5)} className="w-full" />
            </Field>
            <Field label={b.to} htmlFor="bk_to">
              <Input id="bk_to" name="day_end" type="time" required defaultValue={(page?.day_end ?? "16:00").slice(0, 5)} className="w-full" />
            </Field>
            <Field label={b.buffer} htmlFor="bk_buf">
              <Input id="bk_buf" name="buffer_min" type="number" min={0} max={60} defaultValue={page?.buffer_min ?? 0} className="w-full" />
            </Field>
            <Field label={b.notice} htmlFor="bk_notice">
              <Input id="bk_notice" name="notice_hours" type="number" min={0} max={336} defaultValue={page?.notice_hours ?? 12} className="w-full" />
            </Field>
            <Field label={b.ahead} htmlFor="bk_ahead">
              <Input id="bk_ahead" name="days_ahead" type="number" min={1} max={120} defaultValue={page?.days_ahead ?? 30} className="w-full" />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{b.upcoming}</h2>
        {!upcoming || upcoming.length === 0 ? (
          <p className="text-sm text-muted">{b.none}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {upcoming.map((x) => (
              <li key={x.id} className={`flex flex-wrap items-center gap-x-3 py-2 ${x.cancelled_at ? "opacity-50" : ""}`}>
                <span className="w-44 tabular-nums">{formatDateTime(x.starts_at, dateLocale)}</span>
                {x.contact_id ? (
                  <a href={`/app/kontakter/${x.contact_id}`} className="font-medium hover:text-brand">
                    {x.name}
                  </a>
                ) : (
                  <span className="font-medium">{x.name}</span>
                )}
                <span className="text-muted">{[x.company, x.email].filter(Boolean).join(" · ")}</span>
                {x.cancelled_at && <span className="text-xs text-danger">{b.cancelled}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
