import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo, Select } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace, trialDaysLeft } from "@/lib/session";
import { switchWorkspace } from "./actions";
import { Nav } from "./_components/nav";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { user, workspace, workspaces } = await requireWorkspace();
  const { locale, t } = await getI18n();
  const daysLeft = trialDaysLeft(workspace.trial_ends_at);

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
        <Nav t={t.nav} />
        <div className="mt-6 hidden space-y-2 border-t border-border pt-4 text-xs text-muted md:block">
          <Link href="/app/konto" className="block truncate hover:text-foreground hover:underline" title={user.email}>
            {user.email}
          </Link>
          <Link href="/app/konto" className="block hover:text-foreground hover:underline">
            {t.nav.account}
          </Link>
          <form action="/auth/logg-ut" method="post">
            <button type="submit" className="hover:text-foreground hover:underline">
              {t.common.logout}
            </button>
          </form>
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        {workspace.plan === "trial" && (
          <div className="border-b border-border bg-brand-soft px-6 py-2 text-sm text-brand">
            {daysLeft > 0 ? t.trial.daysLeft(daysLeft) : t.trial.over}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
        <div className="flex flex-col items-center gap-2 border-t border-border p-4 md:hidden">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
          <Link href="/app/konto" className="text-xs text-muted hover:underline">
            {t.nav.account}
          </Link>
          <form action="/auth/logg-ut" method="post">
            <button type="submit" className="text-xs text-muted hover:underline">
              {t.common.logout} ({user.email})
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
