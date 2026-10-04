import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/time";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = "force-dynamic";

type Info = { starts_at: string; ends_at: string; name: string; title: string | null; company: string; cancelled: boolean; slug: string | null };

export default async function CancelBookingPage({ params }: PageProps<"/booking/avbestill/[token]">) {
  const { token } = await params;
  const { t, dateLocale } = await getI18n();
  const b = t.booking;
  let info: Info | null = null;
  if (/^[0-9a-f]{40}$/.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("booking_by_token", { p_token: token });
    info = (data as Info | null) ?? null;
  }
  const past = info ? new Date(info.starts_at).getTime() < nowMs() : true;
  const when = info
    ? new Date(info.starts_at).toLocaleString(dateLocale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" })
    : "";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        {!info || past ? (
          <p className="text-sm text-muted">{b.cancelGone}</p>
        ) : info.cancelled ? (
          <p className="font-medium">{b.cancelDone}</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{b.cancelTitle}</h1>
            <p>
              <span className="font-medium">{info.title ?? ""}</span> – {info.company}
              <br />
              {when}
            </p>
            <CancelButton token={token} t={{ confirm: b.cancelConfirm, done: b.cancelDone, failed: b.cancelGone, rebook: b.pickTime }} slug={info.slug} />
          </>
        )}
      </div>
    </main>
  );
}
