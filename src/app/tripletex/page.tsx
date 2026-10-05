import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { tripletexPage } from "@/content/tripletex";
import { getI18n } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const p = tripletexPage[locale];
  return { title: { absolute: p.metaTitle }, description: p.metaDescription, alternates: { canonical: "/tripletex" } };
}

/** Landing page for the Tripletex integration (also required for the Tripletex partner listing). */
export default async function TripletexPage() {
  const { locale, t } = await getI18n();
  const p = tripletexPage[locale];
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${SITE_URL}/tripletex`,
    mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-5">
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

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20">
        <section className="pt-6 pb-10">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            AllSeats ×{" "}
            <a href="https://www.tripletex.no" target="_blank" rel="noopener" className="hover:underline">
              Tripletex
            </a>
          </p>
          <h1 className="mt-3 max-w-[18ch] font-display text-4xl font-bold tracking-[-0.02em] text-balance text-[var(--ink)] sm:text-5xl">
            {p.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-muted">{p.lead}</p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/registrer"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {p.cta}
            </Link>
            <span className="text-sm text-muted">{p.eyebrow}</span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {p.features.map((f) => (
            <div key={f.title} className="rounded-[20px] bg-white p-6">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">{f.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-[var(--ink)]">{p.stepsTitle}</h2>
          <ol className="mt-5 space-y-4">
            {p.steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 leading-relaxed text-[var(--ink)]">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 rounded-[20px] bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">{p.priceTitle}</h2>
          <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">{p.priceText}</p>
          <Link href="/#pris" className="mt-3 inline-block font-medium text-brand hover:underline">
            {locale === "en" ? "See all plans" : "Se alle priser"} →
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">{p.faqTitle}</h2>
          <div className="mt-3 divide-y divide-border rounded-[20px] bg-white px-5 sm:px-7">
            {p.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--ink)]">
                  {f.q}
                  <span aria-hidden className="text-xl text-brand transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-col gap-4 rounded-[20px] bg-[var(--ink)] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold">{p.ctaTitle}</h2>
            <p className="mt-1 text-white/70">{p.ctaText}</p>
          </div>
          <Link
            href="/registrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-white/90"
          >
            {p.cta}
          </Link>
        </section>

        <p className="mt-6 text-sm text-muted">
          {p.tripletexNote}{" "}
          <a href="https://www.tripletex.no" target="_blank" rel="noopener" className="text-brand hover:underline">
            tripletex.no
          </a>
        </p>
      </main>

      <footer className="mx-auto flex w-full max-w-4xl flex-wrap gap-x-4 gap-y-1 px-4 pb-10 text-sm text-muted">
        <Link href="/faq" className="hover:text-foreground hover:underline">
          {t.help.nav}
        </Link>
        <Link href="/vilkar" className="hover:text-foreground hover:underline">
          {t.legal.terms}
        </Link>
        <Link href="/personvern" className="hover:text-foreground hover:underline">
          {t.legal.privacy}
        </Link>
      </footer>
    </div>
  );
}
