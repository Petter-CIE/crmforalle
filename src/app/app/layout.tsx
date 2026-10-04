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
import { Logo, Select } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { logoUrl, requireWorkspace, trialDaysLeft } from "@/lib/session";
import { switchWorkspace } from "./actions";
import { AccountingAutoSync } from "./_components/accounting-auto-sync";
import { BottomNav } from "./_components/bottom-nav";
import { GlobalSearch } from "./_components/global-search";
import { Nav } from "./_components/nav";
import { HashFocus, QuickAdd } from "./_components/quick-add";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, user, workspace, workspaces } = await requireWorkspace();
  const { locale, t } = await getI18n();
  const daysLeft = trialDaysLeft(workspace.trial_ends_at);
  const [{ data: profile }, { data: adminRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, idle_timeout_minutes").eq("id", user.id).maybeSingle(),
    supabase.rpc("platform_admin_status"),
  ]);
  const isPlatformAdmin = !!adminRows?.[0]?.is_admin;
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
                  className="h-6 w-auto max-w-24 object-contain"
                />
              )}
              <span className="truncate">{workspace.name}</span>
            </p>
          )}
          <GlobalSearch t={t.search} />
          <Nav t={t.nav} />
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
            <div className="border-b border-border bg-brand-soft px-6 py-2 text-sm text-brand">
              {daysLeft > 0 ? t.trial.daysLeft(daysLeft) : t.trial.over}
            </div>
          )}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
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
            today: t.nav.today,
            sales: t.nav.sales,
            contacts: t.nav.contacts,
            tasks: t.nav.tasks,
            more: t.mobile.more,
            mainMenu: t.nav.mainMenu,
            account: t.nav.account,
            logout: t.common.logout,
            close: t.mobile.dismiss,
          }}
          user={{ name: displayName, initials, email: user.email ?? "", workspace: workspace.name }}
          more={[
            { href: "/app/tilbud", label: t.nav.quotes },
            { href: "/app/bedrifter", label: t.nav.companies },
            { href: "/app/prosjekter", label: t.nav.projects },
            { href: "/app/rapporter", label: t.nav.reports },
            { href: "/app/e-post", label: t.nav.email },
            { href: "/app/innstillinger", label: t.nav.settings },
            { href: "/faq", label: t.nav.help },
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
