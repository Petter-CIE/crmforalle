// Free times for a booking page. All opening hours are in Norwegian time (Europe/Oslo);
// the database checks every booking again (booking_create), so this only decides what to show.

export type BookingPagePublic = {
  slug: string;
  title: string;
  intro: string | null;
  location: string | null;
  duration: number;
  weekdays: number[];
  day_start: string;
  day_end: string;
  buffer: number;
  notice_hours: number;
  days_ahead: number;
  host: string | null;
  company: string;
  logo_path: string | null;
  busy: [string, string][];
};

export type BookingDay = { date: string; slots: string[] };

const TZ = "Europe/Oslo";

/** Offset of Oslo from UTC in minutes at the given instant (+60 in winter, +120 in summer). */
function osloOffset(ms: number) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(new Date(ms))
    .find((x) => x.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!m) return 60;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** The UTC instant of a wall-clock time in Oslo. */
export function osloToUtc(year: number, month: number, day: number, minutes: number) {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  let ms = guess - osloOffset(guess) * 60_000;
  ms = guess - osloOffset(ms) * 60_000;
  return ms;
}

/** Calendar date (YYYY-MM-DD) and ISO weekday (1 = Monday) in Oslo. */
function osloDate(ms: number) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(new Date(ms));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), iso: `${get("year")}-${get("month")}-${get("day")}`, wd };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Days in the booking window with their free start times (ISO, UTC). */
export function freeSlots(page: BookingPagePublic, now: number): BookingDay[] {
  const start = toMin(page.day_start);
  const end = toMin(page.day_end);
  const earliest = now + page.notice_hours * 3_600_000;
  const latest = now + page.days_ahead * 86_400_000;
  const buffer = page.buffer * 60_000;
  const busy = page.busy.map(([a, b]) => [new Date(a).getTime() - buffer, new Date(b).getTime() + buffer] as const);
  const days: BookingDay[] = [];
  for (let i = 0; i <= page.days_ahead; i++) {
    const day = osloDate(now + i * 86_400_000);
    if (!page.weekdays.includes(day.wd)) continue;
    const slots: string[] = [];
    for (let m = start; m + page.duration <= end; m += page.duration) {
      const s = osloToUtc(day.y, day.m, day.d, m);
      const e = s + page.duration * 60_000;
      if (s < earliest || s > latest) continue;
      if (busy.some(([a, b]) => s < b && e > a)) continue;
      slots.push(new Date(s).toISOString());
    }
    if (slots.length) days.push({ date: day.iso, slots });
  }
  return days;
}
