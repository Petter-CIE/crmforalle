import type { Metadata } from "next";
import { Card, Logo } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Kom i gang" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">Sett opp bedriften din</h1>
          <p className="mb-6 text-sm text-muted">
            Ett minutt, så er du i gang. Du kan invitere kolleger etterpå – uten ekstra kostnad.
          </p>
          <OnboardingForm defaultFullName={profile?.full_name ?? ""} />
        </Card>
      </div>
    </main>
  );
}
