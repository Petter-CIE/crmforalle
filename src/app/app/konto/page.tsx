import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Select } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { PasswordForm } from "@/components/password-form";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { changePassword } from "@/app/nytt-passord/actions";
import { updateIdleTimeout, updateProfile } from "./actions";
import { PushToggle } from "./push-toggle";
import { InstallApp } from "@/components/install-app";
import { vapidPublicKey } from "@/lib/push";
import { PasskeySection, TotpSection, type SecurityTexts } from "./security-client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.security.title };
}

export default async function AccountPage() {
  const { supabase, user } = await requireWorkspace();
  const { data: profile } = await supabase.from("profiles").select("full_name, notify_email, digest_email, idle_timeout_minutes").eq("id", user.id).maybeSingle();
  const { t, dateLocale } = await getI18n();
  const s = t.security;
  const idle = profile?.idle_timeout_minutes ?? 60;
  // Only plain strings can be passed to client components.
  const strings = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === "string")) as SecurityTexts;
  const texts: SecurityTexts = { ...strings, invalidCode: t.mfa.invalid };

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
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="digest_email" value="1" defaultChecked={profile?.digest_email ?? true} className="mt-0.5" />
            <span>{s.digestEmail}</span>
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
        <h2 className="mb-1 font-semibold">{t.mobile.installTitle}</h2>
        <InstallApp
          t={{
            title: t.mobile.installTitle,
            intro: t.mobile.installIntro,
            install: t.mobile.install,
            installed: t.mobile.installed,
            iosSteps: t.mobile.iosSteps,
            otherBrowsers: t.mobile.otherBrowsers,
            dismiss: t.mobile.dismiss,
          }}
        />
        <h3 className="mb-1 mt-6 text-sm font-semibold">{t.mobile.pushTitle}</h3>
        <p className="mb-3 text-sm text-muted">{t.mobile.pushIntro}</p>
        <PushToggle
          publicKey={vapidPublicKey()}
          t={{
            pushOn: t.mobile.pushOn,
            pushOff: t.mobile.pushOff,
            pushEnabled: t.mobile.pushEnabled,
            pushDenied: t.mobile.pushDenied,
            pushUnsupported: t.mobile.pushUnsupported,
            pushTest: t.mobile.pushTest,
            pushTestSent: t.mobile.pushTestSent,
            pushFailed: t.mobile.pushFailed,
          }}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{s.idleTitle}</h2>
        <p className="mb-4 text-sm text-muted">{s.idleIntro}</p>
        <ActionForm action={updateIdleTimeout} submitLabel={s.idleSave} pendingLabel={t.crm.saving} successText={s.idleSaved}>
          <Field label={s.idleLabel} htmlFor="idle_timeout_minutes">
            <Select id="idle_timeout_minutes" name="idle_timeout_minutes" defaultValue={String(idle)} className="w-full max-w-xs">
              {[15, 30, 60, 120, 240, 480].map((n) => (
                <option key={n} value={n}>
                  {s.idleMinutes(n)}
                </option>
              ))}
              <option value="0">{s.idleOff}</option>
            </Select>
          </Field>
          {idle === 0 && <p className="text-xs text-amber-700">{s.idleOffWarning}</p>}
        </ActionForm>
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
