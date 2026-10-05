import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meld deg av", robots: { index: false } };

type Info = { company: string; email: string; done: boolean } | null;

/** Public page from the unsubscribe link in campaign e-mails. Asks for one click before unsubscribing. */
export default async function UnsubscribePage({ params }: PageProps<"/avmelding/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f]{36}$/.test(token) ? await supabase.rpc("campaign_unsubscribe_info", { p_token: token }) : { data: null };
  const info = data as unknown as Info;

  async function unsubscribe() {
    "use server";
    if (!/^[0-9a-f]{36}$/.test(token)) return;
    const db = await createClient();
    await db.rpc("campaign_unsubscribe", { p_token: token });
    revalidatePath(`/avmelding/${token}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--paper)] px-4 py-16">
      <div className="w-full max-w-md rounded-[20px] bg-white p-8 text-center">
        <div className="mb-6 flex justify-center opacity-70">
          <Logo />
        </div>
        {!info ? (
          <>
            <h1 className="text-xl font-semibold">Lenken er ikke gyldig</h1>
            <p className="mt-2 text-sm text-muted">This link is not valid.</p>
          </>
        ) : info.done ? (
          <>
            <h1 className="text-xl font-semibold">Du er meldt av</h1>
            <p className="mt-2 text-muted">
              {info.email} får ikke flere slike e-poster fra {info.company}.
            </p>
            <p className="mt-4 text-sm text-muted">
              You are unsubscribed – {info.email} will not receive more of these e-mails from {info.company}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Meld deg av e-post fra {info.company}?</h1>
            <p className="mt-2 text-muted">{info.email}</p>
            <form action={unsubscribe} className="mt-6">
              <button type="submit" className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover">
                Meld meg av / Unsubscribe
              </button>
            </form>
            <p className="mt-4 text-xs text-muted">Unsubscribe from e-mail sent by {info.company} through AllSeats CRM.</p>
          </>
        )}
      </div>
    </main>
  );
}
