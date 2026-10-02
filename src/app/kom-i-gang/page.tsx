import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Card, Logo } from "@/components/ui";
import { acceptInvitation } from "@/app/invitasjon/[token]/actions";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.onboarding.title };
}

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.rpc("my_invitations"),
  ]);
  const { locale, t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        {(invitations ?? []).map((inv) => (
          <Card key={inv.token} className="border-brand">
            <h1 className="mb-1 text-lg font-semibold">{t.invitation.pending}</h1>
            <p className="mb-4 text-sm text-muted">
              {t.invitation.pendingIntro(inv.workspace_name, inv.invited_by_name)} {t.common.roles[inv.role]} · {user.email}
            </p>
            <form action={acceptInvitation}>
              <input type="hidden" name="token" value={inv.token} />
              <Button type="submit" className="w-full">
                {t.invitation.join}
              </Button>
            </form>
          </Card>
        ))}
        {invitations && invitations.length > 0 && (
          <p className="text-center text-sm text-muted">{t.invitation.orCreate}</p>
        )}
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{t.onboarding.title}</h1>
          <p className="mb-6 text-sm text-muted">{t.onboarding.intro}</p>
          <OnboardingForm
            defaultFullName={profile?.full_name ?? ""}
            t={t.onboarding}
            brreg={t.brreg}
            legal={{ accept: t.legal.accept, terms: t.legal.terms, privacy: t.legal.privacy, dpa: t.legal.dpa }}
          />
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
