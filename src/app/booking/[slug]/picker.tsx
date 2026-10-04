"use client";

import { useState, useTransition } from "react";
import type { BookingDay } from "@/lib/booking";
import { bookMeeting } from "../actions";

type Texts = {
  pickDay: string;
  pickTime: string;
  noSlots: string;
  yourDetails: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  book: string;
  booking: string;
  back: string;
  confirmedTitle: string;
  confirmedText: string;
  addToCalendar: string;
  cancelLink: string;
};

const TZ = "Europe/Oslo";
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none";

/** Day → time → details. Times are shown in Norwegian time, where the opening hours are set. */
export function Picker({ slug, days, locale, t }: { slug: string; days: BookingDay[]; locale: string; t: Texts }) {
  const [day, setDay] = useState(days[0]?.date ?? null);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; start: string } | null>(null);
  const [busy, start] = useTransition();
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const longLabel = (iso: string) =>
    new Date(iso).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });

  if (done) {
    return (
      <div className="space-y-3 text-center" role="status">
        <p className="text-4xl" aria-hidden>
          📅
        </p>
        <h2 className="text-xl font-semibold">{t.confirmedTitle}</h2>
        <p className="font-medium">{longLabel(done.start)}</p>
        <p className="text-sm text-muted">{t.confirmedText}</p>
        {done.token && (
          <div className="flex flex-wrap justify-center gap-3 pt-2 text-sm">
            <a href={`/booking/ics/${done.token}`} className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-hover">
              {t.addToCalendar}
            </a>
            <a href={`/booking/avbestill/${done.token}`} className="rounded-lg border border-border px-4 py-2 hover:bg-background">
              {t.cancelLink}
            </a>
          </div>
        )}
      </div>
    );
  }

  if (days.length === 0) return <p className="text-sm text-muted">{t.noSlots}</p>;
  const current = days.find((d) => d.date === day) ?? days[0];

  if (slot) {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const v = (k: string) => String(fd.get(k) ?? "").trim();
          setError(null);
          start(async () => {
            const res = await bookMeeting(slug, slot, { name: v("name"), email: v("email"), phone: v("phone"), company: v("company"), message: v("message"), website: v("website") });
            if (res.error) {
              setError(res.error);
              // The time may have been taken meanwhile: go back to the list.
              return;
            }
            setDone({ token: res.token ?? "", start: slot });
          });
        }}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">
          <span className="font-medium">🕑 {longLabel(slot)}</span>
          <button type="button" onClick={() => setSlot(null)} className="underline">
            {t.back}
          </button>
        </div>
        <h2 className="font-semibold">{t.yourDetails}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {t.name} *
            <input name="name" required maxLength={120} autoComplete="name" className={`${input} mt-1`} />
          </label>
          <label className="text-sm">
            {t.email} *
            <input name="email" type="email" required maxLength={200} autoComplete="email" className={`${input} mt-1`} />
          </label>
          <label className="text-sm">
            {t.phone}
            <input name="phone" type="tel" maxLength={50} autoComplete="tel" className={`${input} mt-1`} />
          </label>
          <label className="text-sm">
            {t.company}
            <input name="company" maxLength={200} autoComplete="organization" className={`${input} mt-1`} />
          </label>
        </div>
        <label className="block text-sm">
          {t.message}
          <textarea name="message" rows={3} maxLength={2000} className={`${input} mt-1`} />
        </label>
        {/* Honeypot for bots – hidden from people */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {busy ? t.booking : t.book}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">{t.pickDay}</h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDay(d.date)}
              aria-pressed={d.date === current.date}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm first-letter:uppercase ${d.date === current.date ? "border-brand bg-brand text-white" : "border-border hover:border-brand"}`}
            >
              {dayLabel(d.date)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">{t.pickTime}</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {current.slots.map((s) => (
            <button key={s} type="button" onClick={() => setSlot(s)} className="rounded-lg border border-brand/40 px-2 py-2 text-sm font-medium text-brand hover:bg-brand hover:text-white">
              {timeLabel(s)}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
