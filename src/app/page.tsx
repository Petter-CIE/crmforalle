import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ButtonLink, Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");
  const { locale, t } = await getI18n();

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <div className="flex items-center gap-4">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
          <ButtonLink href="/logg-inn" variant="secondary">
            {t.landing.login}
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{t.landing.headline}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{t.landing.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/registrer">{t.landing.cta}</ButtonLink>
        </div>
        <p className="mt-3 text-sm text-muted">{t.landing.price}</p>
      </main>
    </div>
  );
}
