import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getI18n } from "@/lib/i18n/server";
import { needsSecondFactor, safeNext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.mfa.title };
}

export default async function MfaPage({ searchParams }: PageProps<"/logg-inn/mfa">) {
  const { neste } = await searchParams;
  const next = safeNext(neste);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/logg-inn");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!needsSecondFactor(aal)) redirect(next);
  const { t } = await getI18n();

  return (
    <AuthShell
      title={t.mfa.title}
      intro={t.mfa.intro}
      footer={
        <form action="/auth/logg-ut" method="post">
          <button type="submit" className="text-xs hover:underline">
            {t.mfa.otherAccount}
          </button>
        </form>
      }
    >
      <MfaForm next={next} t={t.mfa} />
    </AuthShell>
  );
}
