import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, Input } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { PasswordForm } from "@/components/password-form";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { changePassword } from "@/app/nytt-passord/actions";
import { updateProfile } from "./actions";
import { PasskeySection, TotpSection, type SecurityTexts } from "./security-client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.security.title };
}

export default async function AccountPage() {
  const { supabase, user } = await requireWorkspace();
  const { data: profile } = await supabase.from("profiles").select("full_name, notify_email").eq("id", user.id).maybeSingle();
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
        <h2 className="mb-1 font-semibold">{s.profile}</h2>
        <p className="mb-4 text-sm text-muted">{s.profileIntro}</p>
        <ActionForm action={updateProfile} submitLabel={s.saveProfile} pendingLabel={t.crm.saving} successText={s.profileSaved}>
          <Field label={s.name} htmlFor="full_name">
            <Input id="full_name" name="full_name" autoComplete="name" defaultValue={profile?.full_name ?? ""} className="w-full" />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="notify_email" value="1" defaultChecked={profile?.notify_email ?? true} className="mt-0.5" />
            <span>{s.notifyEmail}</span>
          </label>
        </ActionForm>
      </Card>

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

      <p className="flex flex-wrap gap-x-4 text-xs text-muted">
        <Link href="/vilkar" className="hover:underline">
          {t.legal.terms}
        </Link>
        <Link href="/personvern" className="hover:underline">
          {t.legal.privacy}
        </Link>
        <Link href="/databehandleravtale" className="hover:underline">
          {t.legal.dpa}
        </Link>
      </p>
    </div>
  );
}
