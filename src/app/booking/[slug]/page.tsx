import type { Metadata } from "next";
import Image from "next/image";
import { freeSlots, type BookingPagePublic } from "@/lib/booking";
import { getI18n } from "@/lib/i18n/server";
import { logoUrl } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/time";
import { Picker } from "./picker";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("booking_page_public", { p_slug: slug });
  return (data as BookingPagePublic | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/booking/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  const { t } = await getI18n();
  return { title: p ? `${p.title} · ${p.host ?? p.company}` : t.booking.notFound, robots: { index: false } };
}

/** Public page where a customer picks a time for a meeting. */
export default async function BookingPage({ params }: PageProps<"/booking/[slug]">) {
  const { slug } = await params;
  const { t, dateLocale } = await getI18n();
  const b = t.booking;
  const p = await load(slug);
  if (!p) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">{b.notFound}</p>
      </main>
    );
  }
  const logo = logoUrl(p.logo_path);
  const days = freeSlots(p, nowMs());

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <header className="mb-6 space-y-2">
          {logo ? (
            <Image src={logo} alt={p.company} width={200} height={48} unoptimized style={{ width: "auto", height: "auto" }} className="h-auto max-h-10 w-auto max-w-44 object-contain" />
          ) : (
            <p className="text-sm font-semibold text-brand">{p.company}</p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
          <p className="text-sm text-muted">
            {b.with(p.host ?? "", p.company)} · ⏱ {b.minutes(p.duration)}
            {p.location ? ` · 📍 ${p.location}` : ""}
          </p>
          {p.intro && <p className="whitespace-pre-line text-sm">{p.intro}</p>}
        </header>
        <Picker
          slug={p.slug}
          days={days}
          locale={dateLocale}
          t={{
            pickDay: b.pickDay,
            pickTime: b.pickTime,
            noSlots: b.noSlots,
            yourDetails: b.yourDetails,
            name: b.name,
            email: b.email,
            phone: b.phone,
            company: b.company,
            message: b.message,
            book: b.book,
            booking: b.booking,
            back: b.back,
            confirmedTitle: b.confirmedTitle,
            confirmedText: b.confirmedText,
            addToCalendar: b.addToCalendar,
            cancelLink: b.cancelLink,
          }}
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted">{b.poweredBy}</p>
    </main>
  );
}
