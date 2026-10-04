import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, Logo, Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { safeNext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { OAuthButtons } from "@/components/oauth-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/logg-inn">) {
  const params = await searchParams;
  const next = safeNext(params.neste);
  const failed = params.feil === "lenke";
  const oauthFailed = params.feil === "oauth";
  const idle = params.utlogget === "1";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);
  const { locale, t } = await getI18n();
  // Only plain strings can be passed to the client component.
  const loginTexts = Object.fromEntries(Object.entries(t.login).filter(([, v]) => typeof v === "string")) as Omit<
    typeof t.login,
    "linkSent"
  >;

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
          {oauthFailed && (
            <div className="mb-4">
              <Notice tone="error">{t.login.oauthFailed}</Notice>
            </div>
          )}
          <OAuthButtons next={next} t={{ microsoft: t.login.withMicrosoft, google: t.login.withGoogle, or: t.login.orEmail }} />
          {idle && (
            <div className="mb-4">
              <Notice>{t.security.loggedOutIdle}</Notice>
            </div>
          )}
          <LoginForm next={next} t={loginTexts} />
        </Card>
        <p className="text-center text-sm text-muted">
          {t.login.noAccount}{" "}
          <Link href="/registrer" className="font-medium text-brand hover:underline">
            {t.login.register}
          </Link>
        </p>
        <div className="flex justify-center">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
