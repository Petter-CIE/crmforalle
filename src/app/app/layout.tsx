import { Suspense } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AppUpdates } from "@/components/app-updates";
import { Avatar } from "@/components/avatar";
import { IdleLogout } from "@/components/idle-logout";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ThemeSwitcher, type Theme } from "@/components/theme-switcher";
import { ToastProvider } from "@/components/toast";
import { Button, Input, Logo, Select } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { canManage, logoUrl, requireWorkspace, trialDaysLeft } from "@/lib/session";
import { saveMyName, switchWorkspace } from "./actions";
import { AccountingAutoSync } from "./_components/accounting-auto-sync";
import { BottomNav } from "./_components/bottom-nav";
import { FeedbackLink } from "./_components/feedback-link";
import { GlobalSearch } from "./_components/global-search";
import { Nav } from "./_components/nav";
import { NAV_HREF, NAV_ICON, orderedNav, parseNavPrefs } from "@/lib/nav-items";
import { HashFocus, QuickAdd } from "./_components/quick-add";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, user, workspace, workspaces } = await requireWorkspace();
  const { locale, t } = await getI18n();
  const daysLeft = trialDaysLeft(workspace.trial_ends_at);
  const [{ data: profile }, { data: adminRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, idle_timeout_minutes, nav").eq("id", user.id).maybeSingle(),
    supabase.rpc("platform_admin_status"),
  ]);
  const isPlatformAdmin = !!adminRows?.[0]?.is_admin;
  // The user's own menu: order and hidden sections. The phone tab bar shows the first four.
  const menu = orderedNav(parseNavPrefs(profile?.nav)).map(({ key, hidden }) => ({
    key,
    href: NAV_HREF[key],
    label: t.nav[key],
    hidden,
  }));
  const visibleMenu = menu.filter((m) => !m.hidden);
  const tabs = visibleMenu.slice(0, 4).map((m) => ({ href: m.href, label: m.label, d: NAV_ICON[m.key] }));
  const themeCookie = (await cookies()).get("theme")?.value;
  const theme: Theme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : "auto";
  const logo = logoUrl(workspace.logo_path);
  const themeTexts = {
    theme: t.ui.theme,
    themeAuto: t.ui.themeAuto,
    themeLight: t.ui.themeLight,
    themeDark: t.ui.themeDark,
  };
  const displayName = profile?.full_name || user.email || "";
  const initials =
    displayName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  const userCard = (
    <Link
      href="/app/konto"
      className="flex items-center gap-3 rounded-lg p-2 hover:bg-background"
      title={`${displayName} · ${workspace.name} · ${user.email}`}
    >
      <Avatar name={displayName} size="md" />
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
        <span className="block truncate text-xs text-muted">
          {workspace.name} · {t.common.roles[workspace.role]}
        </span>
        {profile?.full_name && <span className="block truncate text-xs text-muted">{user.email}</span>}
      </span>
    </Link>
  );

  return (
    <ToastProvider t={{ ...t.ui.toast, close: t.ui.toast.close }}>
      <div className="themed flex flex-1 flex-col bg-background text-foreground md:flex-row">
        <aside className="border-b border-border bg-surface p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center justify-between md:block">
            <Link href="/app" aria-label="AllSeats CRM">
              <Logo />
            </Link>
          </div>
          {workspaces.length > 1 ? (
            <form action={switchWorkspace} className="mb-4">
              <label htmlFor="workspace_id" className="sr-only">
                {t.nav.switchCompany}
              </label>
              <Select id="workspace_id" name="workspace_id" defaultValue={workspace.id} className="w-full">
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <button type="submit" className="mt-1 text-xs text-brand hover:underline">
                {t.nav.switch}
              </button>
            </form>
          ) : (
            <p className="mb-4 flex items-center gap-2 truncate text-sm font-medium" title={workspace.name}>
              {logo && (
                <Image
                  src={logo}
                  alt=""
                  width={96}
                  height={24}
                  unoptimized
                  style={{ width: "auto" }}
                  className="h-6 w-auto max-w-24 object-contain"
                />
              )}
              <span className="truncate">{workspace.name}</span>
            </p>
          )}
          <GlobalSearch t={t.search} />
          <Nav
            items={menu}
            t={{
              mainMenu: t.nav.mainMenu,
              customize: t.nav.customize,
              customizeHint: t.nav.customizeHint,
              save: t.common.save,
              saving: t.common.saving,
              cancel: t.crm.cancel,
              reset: t.nav.reset,
              moveUp: t.nav.moveUp,
              moveDown: t.nav.moveDown,
              show: t.nav.show,
            }}
          />
          <div className="hidden md:block">
            <FeedbackLink label={t.feedback.nav} />
          </div>
          <AccountingAutoSync />
          <IdleLogout
            minutes={profile?.idle_timeout_minutes ?? 60}
            t={{
              title: t.security.idleWarnTitle,
              body: t.security.idleWarnBody,
              stay: t.security.idleStay,
              logout: t.security.idleLogoutNow,
            }}
          />
          <div className="mt-6 hidden space-y-2 border-t border-border pt-4 text-xs text-muted md:block">
            {userCard}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
              <Link href="/app/konto" className="hover:text-foreground hover:underline">
                {t.nav.account}
              </Link>
              {isPlatformAdmin && (
                <Link href="/admin" className="font-medium text-amber-800 hover:underline">
                  {t.admin.nav}
                </Link>
              )}
              <form action="/auth/logg-ut" method="post">
                <button type="submit" className="hover:text-foreground hover:underline">
                  {t.common.logout}
                </button>
              </form>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-2">
              <Suspense>
                <LanguageSwitcher locale={locale} label={t.common.language} />
              </Suspense>
              <ThemeSwitcher initial={theme} t={themeTexts} compact />
            </div>
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          {workspace.plan === "trial" && (
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-6 py-2 text-sm ${
                daysLeft > 0 ? "border-border bg-brand-soft text-brand" : "border-red-200 bg-red-50 font-medium text-danger"
              }`}
            >
              <span>{daysLeft > 0 ? t.trial.daysLeft(daysLeft) : t.subscription.bannerOver}</span>
              {canManage(workspace.role) && (
                <Link href="/app/abonnement" className="font-medium underline underline-offset-2">
                  {t.subscription.banner}
                </Link>
              )}
            </div>
          )}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">
            {!profile?.full_name && (
              <form
                action={saveMyName}
                className="mb-6 flex flex-col gap-2 rounded-lg border border-brand/30 bg-brand-soft p-3 text-sm sm:flex-row sm:items-center"
              >
                <p className="flex-1">{t.invitation.nameMissing}</p>
                <Input name="full_name" required maxLength={120} autoComplete="name" aria-label={t.invitation.yourName} placeholder={t.invitation.yourName} className="sm:w-56" />
                <Button type="submit">{t.invitation.nameSave}</Button>
              </form>
            )}
            {children}
          </main>
          <div className="flex flex-col items-center gap-2 border-t border-border p-4 pb-24 md:hidden">
            {userCard}
            <Suspense>
              <LanguageSwitcher locale={locale} label={t.common.language} />
            </Suspense>
            <ThemeSwitcher initial={theme} t={themeTexts} compact />
            <form action="/auth/logg-ut" method="post">
              <button type="submit" className="text-xs text-muted hover:underline">
                {t.common.logout}
              </button>
            </form>
          </div>
        </div>
        <BottomNav
          t={{
            more: t.mobile.more,
            mainMenu: t.nav.mainMenu,
            account: t.nav.account,
            logout: t.common.logout,
            close: t.mobile.dismiss,
          }}
          user={{ name: displayName, initials, email: user.email ?? "", workspace: workspace.name }}
          tabs={tabs}
          more={[
            ...visibleMenu.slice(4).map((m) => ({ href: m.href, label: m.label })),
            { href: "/app/tilbakemelding", label: t.feedback.nav },
            ...(isPlatformAdmin ? [{ href: "/admin", label: t.admin.nav }] : []),
          ]}
        />
        <QuickAdd
          t={{ quickAdd: t.ui.quickAdd, close: t.ui.toast.close, quick: t.ui.quick, shortcuts: t.ui.shortcuts }}
        />
        <HashFocus />
        <PullToRefresh t={{ pull: t.ui.pullToRefresh, release: t.ui.releaseToRefresh }} />
        <AppUpdates t={{ newVersion: t.ui.newVersion, update: t.ui.update }} />
      </div>
    </ToastProvider>
  );
}
