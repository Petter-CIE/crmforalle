import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { changePassword } from "@/app/nytt-passord/actions";
import { PasskeySection, TotpSection, type SecurityTexts } from "./security-client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.security.title };
}

export default async function AccountPage() {
  const { user } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const s = t.security;
  const texts: SecurityTexts = { ...s, invalidCode: t.mfa.invalid };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </header>

      <Card>
        <h2 className="mb-1 font-semibold">{s.password}</h2>
        <p className="mb-4 text-sm text-muted">{s.passwordIntro}</p>
        <PasswordForm
          action={changePassword}
          t={{ ...t.newPassword, submit: s.changePassword, passwordHelp: t.register.passwordHelp }}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{s.twoFactor}</h2>
        <p className="mb-4 text-sm text-muted">{s.twoFactorIntro}</p>
        <TotpSection t={texts} />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{s.passkeys}</h2>
        <p className="mb-4 text-sm text-muted">{s.passkeysIntro}</p>
        <PasskeySection t={texts} dateLocale={dateLocale} />
      </Card>

    </div>
  );
}
