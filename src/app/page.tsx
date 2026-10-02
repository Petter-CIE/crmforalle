import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
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

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");
  const { locale, t, dateLocale } = await getI18n();
  const l = t.landing;

  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
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
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {l.plans.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex flex-col rounded-[24px] p-8 ${i === 0 ? "border border-border bg-white" : "bg-brand-soft"}`}
                >
                  <h3 className="font-display text-xl font-bold text-[var(--ink)]">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted">{p.text}</p>
                  <p className="mt-6 font-display text-[var(--ink)]">
                    <span className="text-5xl font-extrabold tracking-[-0.03em] tabular-nums">{p.price}</span>{" "}
                    <span className="text-base font-medium text-muted">{l.perMonth}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-2.5">
                        <span aria-hidden className="text-brand">
                          ✓
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <CtaLink href="/registrer">{l.cta}</CtaLink>
                  </div>
                </div>
              ))}
            </div>
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
        <a href="mailto:post@allseats.no" className="hover:text-foreground">
          {l.contact}
        </a>
        <Suspense>
          <LanguageSwitcher locale={locale} label={t.common.language} />
        </Suspense>
      </footer>
    </div>
  );
}
