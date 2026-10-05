import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";
import { OAuthButtons } from "@/components/oauth-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.register.title, description: t.meta.registerDescription, alternates: { canonical: "/registrer" } };
}

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");
  const { t } = await getI18n();

  return (
    <AuthShell
      title={t.register.title}
      intro={t.register.intro}
      footer={
        <>
          {t.register.haveAccount}{" "}
          <Link href="/logg-inn" className="font-medium text-brand hover:underline">
            {t.register.login}
          </Link>
        </>
      }
    >
      <OAuthButtons next="/kom-i-gang" t={{ microsoft: t.login.withMicrosoft, google: t.login.withGoogle, or: t.login.orEmail }} />
      <RegisterForm t={{ ...t.register, email: t.login.email, emailPlaceholder: t.login.emailPlaceholder }} />
      <p className="mt-4 text-center text-xs text-muted">
        {t.legal.registerNote}{" "}
        <Link href="/personvern" className="text-brand hover:underline">
          {t.legal.privacy}
        </Link>
        {" · "}
        <Link href="/vilkar" className="text-brand hover:underline">
          {t.legal.terms}
        </Link>
      </p>
    </AuthShell>
  );
}
