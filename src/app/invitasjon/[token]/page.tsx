import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Card, Logo, Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { acceptInvitation } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.invitation.title };
}

export default async function InvitationPage({ params, searchParams }: PageProps<"/invitasjon/[token]">) {
  const { token } = await params;
  const { feil } = await searchParams;
  const { user } = await requireUser();
  const { locale, t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{t.invitation.title}</h1>
          <p className="mb-5 text-sm text-muted">
            {t.invitation.intro} <strong>{user.email}</strong>.
          </p>
          {feil === "epost" && (
            <div className="mb-4">
              <Notice tone="error">{t.invitation.wrongEmail}</Notice>
            </div>
          )}
          {feil === "ugyldig" && (
            <div className="mb-4">
              <Notice tone="error">{t.invitation.invalid}</Notice>
            </div>
          )}
          <form action={acceptInvitation} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              {t.invitation.join}
            </Button>
          </form>
          <form action="/auth/logg-ut" method="post" className="mt-3 text-center">
            <button type="submit" className="text-xs text-muted hover:underline">
              {t.invitation.notYou}
            </button>
          </form>
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
