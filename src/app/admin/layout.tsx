import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card, Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { adminStatus } from "./guard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false } };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { isAdmin, hasAal2, user } = await adminStatus();
  // Non-admins must not learn that this area exists.
  if (!isAdmin) notFound();
  const { t } = await getI18n();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Logo />
            </Link>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
              {t.admin.nav}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/app" className="hover:text-foreground hover:underline">
              {t.admin.backToApp}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        {hasAal2 ? (
          children
        ) : (
          <Card className="mx-auto max-w-lg">
            <h1 className="mb-2 text-lg font-semibold">🔒 {t.admin.needMfa}</h1>
            <p className="mb-4 text-sm text-muted">{t.admin.needMfaText}</p>
            <ButtonLink href="/app/konto">{t.admin.goToAccount}</ButtonLink>
          </Card>
        )}
      </main>
    </div>
  );
}
