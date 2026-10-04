import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Select } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { PasswordForm } from "@/components/password-form";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { changePassword } from "@/app/nytt-passord/actions";
import { disconnectOutlook, saveOutlookOptions, updateIdleTimeout, updateProfile } from "./actions";
import { microsoftEnabled } from "@/lib/microsoft";
import { formatDateTime } from "@/lib/crm";
import { Notice } from "@/components/ui";
import { CalendarLink } from "./calendar-link";
import { PushToggle } from "./push-toggle";
import { InstallApp } from "@/components/install-app";
import { vapidPublicKey } from "@/lib/push";
import { PasskeySection, TotpSection, type SecurityTexts } from "./security-client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.security.title };
}

export default async function AccountPage({ searchParams }: PageProps<"/app/konto">) {
  const sp = await searchParams;
  const { supabase, user, workspace } = await requireWorkspace();
  const { data: ms } = await supabase
    .from("mail_connections")
    .select("account_email, mail_enabled, calendar_enabled, last_sync_at, last_error")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("full_name, notify_email, digest_email, idle_timeout_minutes").eq("id", user.id).maybeSingle();
  const { t, dateLocale } = await getI18n();
  const s = t.security;
  const idle = profile?.idle_timeout_minutes ?? 60;
  // Only plain strings can be passed to client components.
  const strings = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === "string")) as SecurityTexts;
  const texts: SecurityTexts = { ...strings, invalidCode: t.mfa.invalid };
  const themeCookie = (await cookies()).get("theme")?.value;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </header>

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
        <h2 id="microsoft" className="mb-1 scroll-mt-8 font-semibold">
          ✉️ {t.outlook.title}
        </h2>
        <p className="mb-4 text-sm text-muted">{t.outlook.intro}</p>
        {sp.ms === "ok" && <Notice>{t.outlook.ok}</Notice>}
        {sp.ms === "feil" && <Notice tone="error">{t.outlook.failed}</Notice>}
        {sp.ms === "avbrutt" && <Notice>{t.outlook.cancelled}</Notice>}
        {!ms ? (
          microsoftEnabled() ? (
            <a
              href="/app/konto/microsoft/start"
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            >
              <svg aria-hidden viewBox="0 0 21 21" width="16" height="16">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {t.outlook.connect}
            </a>
          ) : (
            <p className="text-sm text-muted">{t.outlook.notAvailable}</p>
          )
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="font-medium">✓ {t.outlook.connected(ms.account_email ?? "Microsoft")}</p>
            <p className="text-xs text-muted">{ms.last_sync_at ? t.outlook.lastSync(formatDateTime(ms.last_sync_at, dateLocale)) : t.outlook.waiting}</p>
            {ms.last_error && <Notice tone="error">{t.outlook.error(ms.last_error)}</Notice>}
            <form action={saveOutlookOptions} className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="mail" value="1" defaultChecked={ms.mail_enabled} />
                {t.outlook.mail}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="calendar" value="1" defaultChecked={ms.calendar_enabled} />
                {t.outlook.calendar}
              </label>
              <p className="text-xs text-muted">{t.outlook.onlyKnown}</p>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
                  {t.outlook.save}
                </button>
                <button formAction={disconnectOutlook} type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-background">
                  {t.outlook.disconnect}
                </button>
              </div>
            </form>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">🗓️ {t.booking.title}</h2>
        <p className="mb-4 text-sm text-muted">{t.booking.intro}</p>
        <Link href="/app/konto/booking" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {t.booking.title} →
        </Link>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{t.calendar.title}</h2>
        <p className="mb-4 text-sm text-muted">{t.calendar.intro}</p>
        <CalendarLink t={t.calendar} />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{t.ui.theme}</h2>
        <p className="mb-4 text-sm text-muted">{t.ui.themeIntro}</p>
        <ThemeSwitcher
          initial={themeCookie === "dark" || themeCookie === "light" ? themeCookie : "auto"}
          t={{ theme: t.ui.theme, themeAuto: t.ui.themeAuto, themeLight: t.ui.themeLight, themeDark: t.ui.themeDark }}
        />
      </Card>

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
