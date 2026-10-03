import { Suspense } from "react";
import Link from "next/link";
import { IdleLogout } from "@/components/idle-logout";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo, Select } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace, trialDaysLeft } from "@/lib/session";
import { switchWorkspace } from "./actions";
import { AccountingAutoSync } from "./_components/accounting-auto-sync";
import { BottomNav } from "./_components/bottom-nav";
import { GlobalSearch } from "./_components/global-search";
import { Nav } from "./_components/nav";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, user, workspace, workspaces } = await requireWorkspace();
  const { locale, t } = await getI18n();
  const daysLeft = trialDaysLeft(workspace.trial_ends_at);
  const [{ data: profile }, { data: adminRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, idle_timeout_minutes").eq("id", user.id).maybeSingle(),
    supabase.rpc("platform_admin_status"),
  ]);
  const isPlatformAdmin = !!adminRows?.[0]?.is_admin;
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
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
        {initials}
      </span>
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
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-border bg-surface p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:block">
          <Link href="/app">
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
          <p className="mb-4 truncate text-sm font-medium" title={workspace.name}>
            {workspace.name}
          </p>
        )}
        <GlobalSearch t={t.search} />
        <Nav t={t.nav} />
        <AccountingAutoSync />
        <IdleLogout
          minutes={profile?.idle_timeout_minutes ?? 60}
          t={{ title: t.security.idleWarnTitle, body: t.security.idleWarnBody, stay: t.security.idleStay, logout: t.security.idleLogoutNow }}
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
          <div className="px-2">
            <Suspense>
              <LanguageSwitcher locale={locale} label={t.common.language} />
            </Suspense>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        {workspace.plan === "trial" && (
          <div className="border-b border-border bg-brand-soft px-6 py-2 text-sm text-brand">
            {daysLeft > 0 ? t.trial.daysLeft(daysLeft) : t.trial.over}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
        <div className="flex flex-col items-center gap-2 border-t border-border p-4 pb-24 md:hidden">
          {userCard}
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
          <form action="/auth/logg-ut" method="post">
            <button type="submit" className="text-xs text-muted hover:underline">
              {t.common.logout}
            </button>
          </form>
        </div>
      </div>
      <BottomNav
        t={{ today: t.nav.today, sales: t.nav.sales, contacts: t.nav.contacts, tasks: t.nav.tasks, search: t.mobile.search, mainMenu: t.nav.mainMenu }}
      />
    </div>
  );
}
