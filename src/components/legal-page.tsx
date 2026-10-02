import { Suspense } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import type { LegalDoc } from "@/content/legal/types";
import { getI18n } from "@/lib/i18n/server";

const LINKS = [
  { href: "/vilkar", key: "terms" },
  { href: "/personvern", key: "privacy" },
  { href: "/databehandleravtale", key: "dpa" },
] as const;

/** Renders one of the legal documents with links to the others. */
export async function LegalPage({ doc, current }: { doc: LegalDoc; current: (typeof LINKS)[number]["key"] }) {
  const { locale, t } = await getI18n();
  return (
    <div className="landing flex flex-1 flex-col bg-[var(--paper)]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5">
        <Link href="/" aria-label="AllSeats CRM">
          <Logo />
        </Link>
        <Suspense>
          <LanguageSwitcher locale={locale} label={t.common.language} />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20">
        <nav className="mb-8 flex flex-wrap gap-1 text-sm" aria-label={t.legal.nav}>
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={l.key === current ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 ${l.key === current ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-white"}`}
            >
              {t.legal[l.key]}
            </Link>
          ))}
        </nav>
        <article className="rounded-[24px] bg-white p-6 sm:p-10">
          <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-[var(--ink)]">{doc.title}</h1>
          <p className="mt-3 text-muted">{doc.lead}</p>
          {doc.sections.map((s) => (
            <section key={s.h} className="mt-8">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">{s.h}</h2>
              <div className="mt-2 space-y-3 leading-relaxed">
                {s.body.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i}>{b}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-1.5 pl-5">
                      {b.list.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
        <p className="mt-6 text-sm text-muted">
          {t.legal.questions}{" "}
          <a href="mailto:post@allseats.no" className="text-brand hover:underline">
            post@allseats.no
          </a>
        </p>
      </main>
    </div>
  );
}
