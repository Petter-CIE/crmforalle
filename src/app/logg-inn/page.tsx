import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, Logo, Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/logg-inn">) {
  const params = await searchParams;
  const rawNext = typeof params.neste === "string" ? params.neste : "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  const failed = params.feil === "lenke";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);
  const { locale, t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center">
          <Logo />
        </Link>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{t.login.title}</h1>
          <p className="mb-5 text-sm text-muted">{t.login.intro}</p>
          {failed && (
            <div className="mb-4">
              <Notice tone="error">{t.login.badLink}</Notice>
            </div>
          )}
          <LoginForm next={next} t={t.login} />
        </Card>
        <div className="flex justify-center">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
