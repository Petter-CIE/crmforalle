import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.onboarding.title };
}

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { locale, t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{t.onboarding.title}</h1>
          <p className="mb-6 text-sm text-muted">{t.onboarding.intro}</p>
          <OnboardingForm defaultFullName={profile?.full_name ?? ""} t={t.onboarding} brreg={t.brreg} />
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
