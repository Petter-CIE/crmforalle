import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

/** Centered card layout shared by login, registration and password pages. */
export async function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { locale, t } = await getI18n();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center">
          <Logo />
        </Link>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{title}</h1>
          {intro && <p className="mb-5 text-sm text-muted">{intro}</p>}
          {children}
        </Card>
        {footer && <div className="text-center text-sm text-muted">{footer}</div>}
        <div className="flex justify-center">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
