import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { PasswordForm } from "@/components/password-form";
import { getI18n } from "@/lib/i18n/server";
import { requireUser, safeNext } from "@/lib/session";
import { setPasswordAndContinue } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.newPassword.title };
}

export default async function NewPasswordPage({ searchParams }: PageProps<"/nytt-passord">) {
  const { neste } = await searchParams;
  const next = safeNext(neste);
  const { user } = await requireUser({ allowNoPassword: true, returnTo: `/nytt-passord?neste=${encodeURIComponent(next)}` });
  const { t } = await getI18n();

  return (
    <AuthShell title={t.newPassword.title} intro={`${t.newPassword.intro} (${user.email})`}>
      <PasswordForm
        action={setPasswordAndContinue}
        next={next}
        t={{ ...t.newPassword, passwordHelp: t.register.passwordHelp }}
      />
    </AuthShell>
  );
}
