import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { faq } from "@/content/faq";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: faq[locale].title, description: faq[locale].lead, alternates: { canonical: "/faq" } };
}

export default async function FaqPage() {
  const { locale, t } = await getI18n();
  const f = faq[locale];

  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5">
        <Link href="/" aria-label="AllSeats CRM">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/app" className="font-medium text-brand hover:underline">
            {t.help.toApp}
          </Link>
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20">
        <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-[var(--ink)]">{f.title}</h1>
        <p className="mt-3 max-w-[60ch] text-muted">{f.lead}</p>

        <nav aria-label={t.help.contents} className="mt-6 flex flex-wrap gap-2 text-sm">
          {f.groups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border bg-white px-3 py-1.5 hover:border-brand hover:text-brand">
              {g.title}
            </a>
          ))}
        </nav>

        {f.groups.map((g) => (
          <section key={g.id} id={g.id} className="mt-10 scroll-mt-6">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">{g.title}</h2>
            <div className="mt-3 divide-y divide-border rounded-[20px] bg-white px-5 sm:px-7">
              {g.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--ink)]">
                    {item.q}
                    <span aria-hidden className="text-xl text-brand transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="mt-2 max-w-[65ch] space-y-2 leading-relaxed text-muted">
                    {item.a.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    {item.link && (
                      <p>
                        <a href={item.link.href} className="font-medium text-brand hover:underline">
                          {item.link.label} →
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 flex flex-col gap-4 rounded-[20px] bg-[var(--ink)] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold">{f.contactTitle}</h2>
            <p className="mt-1 text-white/70">{f.contactText}</p>
          </div>
          <a
            href="mailto:post@allseats.no"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-white/90"
          >
            {t.help.write}
          </a>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-4 gap-y-1 px-4 pb-10 text-sm text-muted">
        <Link href="/vilkar" className="hover:text-foreground hover:underline">
          {t.legal.terms}
        </Link>
        <Link href="/personvern" className="hover:text-foreground hover:underline">
          {t.legal.privacy}
        </Link>
        <Link href="/databehandleravtale" className="hover:text-foreground hover:underline">
          {t.legal.dpa}
        </Link>
      </footer>
    </div>
  );
}
