import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_PRICE } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site-url";
import { PricingPlans } from "./pricing-plans";
import { SeatCalculator } from "./seat-calculator";

function CtaLink({ href, children, tone = "brand" }: { href: string; children: React.ReactNode; tone?: "brand" | "light" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors ${
        tone === "brand" ? "bg-brand text-white hover:bg-brand-hover" : "bg-white text-[var(--ink)] hover:bg-[var(--seat-on)]"
      }`}
    >
      {children}
    </Link>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: t.meta.homeTitle },
    description: t.meta.homeDescription,
    alternates: { canonical: "/" },
  };
}

/** Structured data so search engines know this is business software with a price. */
function jsonLd(description: string) {
  const offer = (name: string, price: number) => ({
    "@type": "Offer",
    name,
    price,
    priceCurrency: "NOK",
    priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "NOK", unitText: "MONTH", valueAddedTaxIncluded: false },
  });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "AllSeats CRM",
        url: `${SITE_URL}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        inLanguage: ["nb", "en"],
        description,
        offers: [offer("Start", PLAN_PRICE.start), offer("Bedrift", PLAN_PRICE.bedrift)],
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: "CIE AS",
        url: `${SITE_URL}/`,
        email: "post@allseats.no",
        address: { "@type": "PostalAddress", streetAddress: "Bjørøyvegen 332", postalCode: "5177", addressLocality: "Bjørøyhamn", addressCountry: "NO" },
      },
    ],
  };
}

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");
  const { locale, t, dateLocale } = await getI18n();
  const l = t.landing;
  const pl = t.pilot;
  const { data: pilotSpots } = await supabase.rpc("pilot_spots_left");
  const spots = typeof pilotSpots === "number" ? pilotSpots : 0;

  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(t.meta.homeDescription)).replace(/</g, "\\u003c") }}
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 md:px-8">
        <Link href="/" aria-label="AllSeats CRM">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#funksjoner" className="hover:text-foreground">
            {l.navFeatures}
          </a>
          <a href="#pris" className="hover:text-foreground">
            {l.navPricing}
          </a>
          <a href="#sporsmal" className="hover:text-foreground">
            {l.navFaq}
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <Suspense>
              <LanguageSwitcher locale={locale} label={t.common.language} />
            </Suspense>
          </div>
          <Link href="/logg-inn" className="text-sm font-medium hover:text-brand">
            {l.login}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero: the promise on the left, the seat map on the right */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-8 md:px-8 md:pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            {spots > 0 && (
              <a
                href="#pilot"
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand hover:border-brand"
              >
                <span aria-hidden>⭐</span>
                {pl.pill(spots)}
                <span aria-hidden>→</span>
              </a>
            )}
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.025em] text-[var(--ink)] sm:text-6xl">
              {l.headline}
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">{l.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CtaLink href="/registrer">{l.cta}</CtaLink>
              <span className="text-sm text-muted">{l.price}</span>
            </div>
          </div>
          <SeatCalculator
            locale={dateLocale}
            t={{
              calcTitle: l.calcTitle,
              calcPeople: l.calcPeople(99).replace("99", "{n}"),
              calcPeopleOne: l.calcPeople(1),
              calcPerUserLabel: l.calcPerUserLabel,
              calcPerUser: l.calcPerUser,
              calcOurs: l.calcOurs,
              calcPerMonth: l.calcPerMonth,
              calcSaving: l.calcSaving("{amount}"),
              calcSame: l.calcSame,
              calcNote: l.calcNote,
            }}
          />
        </section>

        {/* Pilot programme: first 10 companies */}
        {spots > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-8">
            {spots > 0 && (
              <div id="pilot" className="scroll-mt-8 rounded-2xl border-2 border-dashed border-brand/40 bg-white p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <span className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                      {pl.badge}
                    </span>
                    <h3 className="mt-3 font-display text-2xl font-bold text-[var(--ink)]">{pl.title}</h3>
                    <p className="mt-2 text-muted">{pl.lead}</p>
                    <p className="mt-3 text-lg font-semibold text-brand">{pl.offer}</p>
                  </div>
                  <div className="text-right">
                    {/* Ten seats: the taken ones filled */}
                    <div aria-hidden className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} className={`h-4 w-4 rounded-[5px_5px_2px_2px] ${i < 10 - spots ? "bg-[var(--ink)]" : "bg-[var(--seat-on)]"}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--ink)]">{pl.spotsLeft(spots)}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {[
                    [pl.giveTitle, pl.give],
                    [pl.getTitle, pl.get],
                  ].map(([title, items]) => (
                    <div key={title as string}>
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title as string}</h4>
                      <ul className="space-y-1.5">
                        {(items as string[]).map((x) => (
                          <li key={x} className="flex gap-2">
                            <span aria-hidden className="text-brand">
                              ✓
                            </span>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <a
                    href={`mailto:post@allseats.no?subject=${encodeURIComponent(pl.ctaSubject)}`}
                    className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-hover"
                  >
                    {pl.cta}
                  </a>
                  <p className="text-sm text-muted">{pl.after}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Features */}
        <section id="funksjoner" className="scroll-mt-8 border-t border-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
            <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-4xl">
              {l.featuresTitle}
            </h2>
            <p className="mt-3 max-w-xl text-muted">{l.featuresLead}</p>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {l.features.map((f) => (
                <div key={f.title} className="border-t-2 border-[var(--ink)] pt-4">
                  <h3 className="font-display text-lg font-bold text-[var(--ink)]">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-[var(--ink)] text-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:px-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-[-0.015em]">{l.securityTitle}</h2>
              <p className="mt-3 text-white/70">{l.languages}</p>
            </div>
            <ul className="space-y-4">
              {l.security.map((s) => (
                <li key={s} className="flex gap-3 text-lg">
                  <span aria-hidden className="mt-2 h-3 w-3 shrink-0 rounded-[4px_4px_2px_2px] bg-[var(--seat-on)]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pris" className="scroll-mt-8">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
            <h2 className="font-display text-3xl font-bold tracking-[-0.015em] text-[var(--ink)] sm:text-4xl">{l.pricingTitle}</h2>
            <p className="mt-3 text-muted">{l.pricingLead}</p>
            <PricingPlans
              plans={l.plans}
              locale={dateLocale}
              t={{
                perMonth: l.perMonth,
                perYear: l.perYear,
                billingMonthly: l.billingMonthly,
                billingYearly: l.billingYearly,
                yearlyBadge: l.yearlyBadge,
                yearlyEquals: l.yearlyEquals("{amount}"),
                monthlyNote: l.monthlyNote,
                cta: l.cta,
              }}
            />
          </div>
        </section>

        {/* FAQ */}
        <section id="sporsmal" className="scroll-mt-8 border-t border-border bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1fr_1.6fr]">
            <h2 className="font-display text-3xl font-bold tracking-[-0.015em] text-[var(--ink)]">{l.faqTitle}</h2>
            <div className="divide-y divide-border border-y border-border">
              {l.faq.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-[var(--ink)]">
                    {f.q}
                    <span aria-hidden className="text-2xl font-medium text-brand transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
              <p className="pt-5">
                <Link href="/faq" className="font-medium text-brand hover:underline">
                  {t.help.allQuestions}
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-[var(--ink)] text-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-[-0.015em]">{l.finalTitle}</h2>
              <p className="mt-2 text-white/70">{l.finalText}</p>
            </div>
            <CtaLink href="/registrer" tone="light">
              {l.cta}
            </CtaLink>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
        <span>
          © {new Date().getFullYear()}{" "}
          <a
            href="https://virksomhet.brreg.no/nb/oppslag/enheter/818823452"
            className="hover:text-foreground hover:underline"
            rel="noopener"
            target="_blank"
          >
            {l.operator}
          </a>
        </span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t.legal.nav}>
          <Link href="/faq" className="hover:text-foreground hover:underline">
            {t.help.nav}
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
          <a href="mailto:post@allseats.no" className="hover:text-foreground hover:underline">
            post@allseats.no
          </a>
        </nav>
        <Suspense>
          <LanguageSwitcher locale={locale} label={t.common.language} />
        </Suspense>
      </footer>
    </div>
  );
}
