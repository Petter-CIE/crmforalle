import { redirect } from "next/navigation";
import { ButtonLink, Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <ButtonLink href="/logg-inn" variant="secondary">
          Logg inn
        </ButtonLink>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          CRM for hele bedriften. Én fast pris.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Kunder, salg og oppfølging på ett sted – med ubegrenset antall brukere. Bedriftsdata hentes automatisk fra
          Brønnøysundregistrene.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/logg-inn">Prøv gratis i 14 dager</ButtonLink>
        </div>
        <p className="mt-3 text-sm text-muted">Fra 249 kr/mnd eks. mva. Ingen pris per bruker.</p>
      </main>
    </div>
  );
}
