import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { docs, type DocBlock } from "@/content/docs";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const d = docs[locale];
  return { title: { absolute: d.metaTitle }, description: d.metaDescription, alternates: { canonical: "/dokumentasjon" } };
}

function Block({ b }: { b: DocBlock }) {
  return (
    <div className="space-y-3">
      {b.h && <h3 className="font-display text-base font-bold text-[var(--ink)]">{b.h}</h3>}
      {b.p?.map((p) => (
        <p key={p} className="max-w-[68ch] leading-relaxed text-muted">
          {p}
        </p>
      ))}
      {b.steps && (
        <ol className="max-w-[68ch] space-y-2">
          {b.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed text-[var(--ink)]">{s}</span>
            </li>
          ))}
        </ol>
      )}
      {b.bullets && (
        <ul className="max-w-[68ch] list-disc space-y-1.5 pl-5 leading-relaxed text-muted marker:text-brand">
          {b.bullets.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Public product documentation, Norwegian and English. */
export default async function DocsPage() {
  const { locale, t } = await getI18n();
  const d = docs[locale];

  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 md:px-8">
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

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 md:px-8">
        <div className="pt-4 pb-8">
          <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-[var(--ink)] sm:text-5xl">{d.title}</h1>
          <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted">{d.lead}</p>
          <p className="mt-2 text-sm text-muted">{d.updated}</p>
        </div>

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <nav aria-label={d.contents} className="mb-10 lg:mb-0">
            <div className="rounded-[20px] bg-white p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:-mx-2 lg:overflow-y-auto lg:bg-transparent lg:px-2 lg:py-0">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{d.contents}</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {d.groups.map((g) => (
                  <div key={g.title}>
                    <p className="mb-1.5 text-sm font-semibold text-[var(--ink)]">{g.title}</p>
                    <ul className="space-y-1 border-l border-border pl-3 text-sm">
                      {g.sections.map((s) => (
                        <li key={s.id}>
                          <a href={`#${s.id}`} className="text-muted hover:text-brand">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <main className="min-w-0 space-y-14">
            {d.groups.map((g) => (
              <div key={g.title} className="space-y-6">
                <h2 className="text-xs font-semibold tracking-wide text-brand uppercase">{g.title}</h2>
                {g.sections.map((s) => (
                  <section key={s.id} id={s.id} className="scroll-mt-6 rounded-[20px] bg-white p-6 sm:p-8">
                    <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[var(--ink)]">{s.title}</h2>
                    <div className="space-y-6">
                      {s.blocks.map((b, i) => (
                        <Block key={i} b={b} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ))}

            <section className="flex flex-col gap-4 rounded-[20px] bg-[var(--ink)] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="font-display text-xl font-bold">{d.contactTitle}</h2>
                <p className="mt-1 text-white/70">{d.contactText}</p>
                <Link href="/faq" className="mt-2 inline-block text-sm font-medium text-[var(--seat-on)] hover:underline">
                  {d.faqLink} →
                </Link>
              </div>
              <a
                href="mailto:post@allseats.no"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-white/90"
              >
                {t.help.write}
              </a>
            </section>
          </main>
        </div>
      </div>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-4 gap-y-1 px-4 pb-10 text-sm text-muted md:px-8">
        <Link href="/faq" className="hover:text-foreground hover:underline">
          {t.help.nav}
        </Link>
        <Link href="/tripletex" className="hover:text-foreground hover:underline">
          Tripletex
        </Link>
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
