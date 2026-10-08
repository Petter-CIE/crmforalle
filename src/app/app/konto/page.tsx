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
import { addSharedMailbox, disconnectOutlook, saveOutlookOptions, updateIdleTimeout, updateProfile } from "./actions";
import { googleEnabled } from "@/lib/google";
import { microsoftEnabled } from "@/lib/microsoft";
import { formatDateTime } from "@/lib/crm";
import { Notice } from "@/components/ui";
import { CalendarLink } from "./calendar-link";
import { PushToggle } from "./push-toggle";
import { InstallApp } from "@/components/install-app";
import { vapidPublicKey } from "@/lib/push";
import { PasskeySection, TotpSection, type SecurityTexts } from "./security-client";
import { deleteMyAccount } from "@/app/app/innstillinger/deletion-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.security.title };
}

export default async function AccountPage({ searchParams }: PageProps<"/app/konto">) {
  const sp = await searchParams;
  const { supabase, user, workspace, workspaces } = await requireWorkspace();
  // Owners must delete their companies before they can delete their own login.
  const ownsCompany = workspaces.some((w) => w.role === "owner" && !w.deletion_requested_at);
  const [{ data: mailboxes }, { data: projects }] = await Promise.all([
    supabase
      .from("mail_connections")
      .select("id, provider, account_email, mail_enabled, calendar_enabled, last_sync_at, last_error, project_id, parent_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .order("created_at"),
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
  ]);
  // Each main account followed by its shared mailboxes; the "add shared" form closes the group.
  const all = (mailboxes ?? []).filter((m) => m.provider !== "google");
  const googleCal = (mailboxes ?? []).find((m) => m.provider === "google");
  const ordered = all
    .filter((m) => !m.parent_id)
    .flatMap((p) => {
      const group = [p, ...all.filter((c) => c.parent_id === p.id)];
      return group.map((ms, i) => ({ ms, groupId: p.id, last: i === group.length - 1 }));
    });
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, notify_email, digest_email, idle_timeout_minutes")
    .eq("id", user.id)
    .maybeSingle();
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
        {!microsoftEnabled() ? (
          <p className="text-sm text-muted">{t.outlook.notAvailable}</p>
        ) : (
          <div className="mt-2 space-y-4 text-sm">
            {ordered.map(({ ms, groupId, last }) => (
              <div key={ms.id} className={ms.parent_id ? "ml-6 border-l-2 border-brand/30 pl-4" : ""}>
                <form action={saveOutlookOptions} className="space-y-2 rounded-lg border border-border p-4">
                  <input type="hidden" name="id" value={ms.id} />
                  <p className="font-medium">✓ {ms.account_email ?? "Microsoft"}</p>
                  <p className="text-xs text-muted">
                    {ms.last_sync_at ? t.outlook.lastSync(formatDateTime(ms.last_sync_at, dateLocale)) : t.outlook.waiting}
                  </p>
                  {ms.parent_id && <p className="text-xs text-muted">{t.outlook.sharedLabel}</p>}
                  {ms.last_error && (
                    <Notice tone="error">{ms.parent_id ? t.outlook.sharedError(ms.last_error) : t.outlook.error(ms.last_error)}</Notice>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">{t.outlook.project}</span>
                    <Select name="project_id" defaultValue={ms.project_id ?? ""} className="w-full max-w-sm">
                      <option value="">{t.outlook.noProject}</option>
                      {(projects ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="mail" value="1" defaultChecked={ms.mail_enabled} />
                    {t.outlook.mail}
                  </label>
                  {!ms.parent_id && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="calendar" value="1" defaultChecked={ms.calendar_enabled} />
                      {t.outlook.calendar}
                    </label>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
                      {t.outlook.save}
                    </button>
                    <button
                      formAction={disconnectOutlook}
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-background"
                    >
                      {t.outlook.disconnect}
                    </button>
                  </div>
                </form>
                {last && (
                  <details className={ms.parent_id ? "mt-2 text-sm" : "ml-6 mt-2 text-sm"}>
                    <summary className="cursor-pointer text-brand">+ {t.outlook.addShared}</summary>
                    <form action={addSharedMailbox} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
                      <input type="hidden" name="parent_id" value={groupId} />
                      <label className="min-w-52 flex-1">
                        <span className="mb-1 block text-xs text-muted">{t.outlook.sharedAddress}</span>
                        <Input name="address" type="email" required placeholder="post@firma.no" className="w-full" />
                      </label>
                      <label className="min-w-44">
                        <span className="mb-1 block text-xs text-muted">{t.outlook.project}</span>
                        <Select name="project_id" defaultValue="" className="w-full">
                          <option value="">{t.outlook.noProject}</option>
                          {(projects ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                        {t.outlook.addSharedButton}
                      </button>
                      <p className="w-full text-xs text-muted">{t.outlook.sharedHelp}</p>
                    </form>
                  </details>
                )}
              </div>
            ))}
            <form
              action="/app/konto/microsoft/start"
              method="get"
              className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-4"
            >
              <label className="min-w-48 flex-1">
                <span className="mb-1 block text-xs text-muted">{t.outlook.project}</span>
                <Select name="prosjekt" defaultValue="" className="w-full">
                  <option value="">{t.outlook.noProject}</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
              >
                <svg aria-hidden viewBox="0 0 21 21" width="16" height="16">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                {all.length ? t.outlook.connectAnother : t.outlook.connect}
              </button>
            </form>
            <p className="text-xs text-muted">
              {t.outlook.onlyKnown} {t.outlook.projectHelp}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h2 id="google" className="mb-1 scroll-mt-8 font-semibold">
          📅 {t.google.title}
        </h2>
        <p className="mb-4 text-sm text-muted">{t.google.intro}</p>
        {sp.g === "ok" && <Notice>{t.google.ok}</Notice>}
        {sp.g === "feil" && (
          <Notice tone="error">
            {t.google.failed}
            {typeof sp.gw === "string" && sp.gw ? ` (${sp.gw})` : ""}
          </Notice>
        )}
        {sp.g === "avbrutt" && <Notice>{t.google.cancelled}</Notice>}
        {!googleEnabled() ? (
          <p className="text-sm text-muted">{t.google.notAvailable}</p>
        ) : googleCal ? (
          <form action={disconnectOutlook} className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <input type="hidden" name="id" value={googleCal.id} />
            <p className="font-medium">✓ {t.google.connected(googleCal.account_email ?? "Google")}</p>
            <p className="text-xs text-muted">
              {googleCal.last_sync_at ? t.google.lastSync(formatDateTime(googleCal.last_sync_at, dateLocale)) : t.google.waiting}
            </p>
            {googleCal.last_error && <Notice tone="error">{t.google.error(googleCal.last_error)}</Notice>}
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-background">
              {t.google.disconnect}
            </button>
          </form>
        ) : (
          <a
            href="/app/konto/google/start"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
          >
            <svg aria-hidden viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
            </svg>
            {t.google.connect}
          </a>
        )}
        <p className="mt-3 text-xs">
          <a href="/app/e-post#gmail" className="text-brand hover:underline">
            {t.google.gmailLink} →
          </a>
        </p>
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
          <Field label={s.phone} htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} defaultValue={profile?.phone ?? ""} className="w-full" />
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
        <PasswordForm action={changePassword} t={{ ...t.newPassword, submit: s.changePassword, passwordHelp: t.register.passwordHelp }} />
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

      <Card className="border-danger/40">
        <h2 className="mb-1 font-semibold text-danger">{t.deletion.accountTitle}</h2>
        {ownsCompany ? (
          <p className="text-sm text-muted">{t.deletion.accountOwner}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{t.deletion.accountIntro}</p>
            <ActionForm action={deleteMyAccount} submitLabel={t.deletion.accountButton} pendingLabel={t.crm.saving}>
              <Field label={t.deletion.confirmEmail} htmlFor="confirm_email">
                <Input id="confirm_email" name="confirm_email" type="email" required autoComplete="off" className="w-full max-w-sm" />
              </Field>
            </ActionForm>
          </>
        )}
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
