import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getI18n } from "@/lib/i18n/server";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.forgot.title };
}

export default async function ForgotPage() {
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t.forgot.title}
      intro={t.forgot.intro}
      footer={
        <Link href="/logg-inn" className="text-brand hover:underline">
          {t.forgot.back}
        </Link>
      }
    >
      <ForgotForm t={{ ...t.forgot, email: t.login.email, emailPlaceholder: t.login.emailPlaceholder }} />
    </AuthShell>
  );
}
