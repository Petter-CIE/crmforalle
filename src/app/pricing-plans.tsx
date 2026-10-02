"use client";

import { useState } from "react";
import Link from "next/link";

type Plan = { name: string; price: number; text: string; items: string[]; addon: string | null };

export function PricingPlans({
  plans,
  locale,
  t,
}: {
  plans: Plan[];
  locale: string;
  t: {
    perMonth: string;
    perYear: string;
    billingMonthly: string;
    billingYearly: string;
    yearlyBadge: string;
    yearlyEquals: string; // contains "{amount}"
    monthlyNote: string;
    cta: string;
  };
}) {
  const [yearly, setYearly] = useState(false);
  const num = (n: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);

  return (
    <div className="mt-8">
      <div role="radiogroup" aria-label={`${t.billingMonthly} / ${t.billingYearly}`} className="inline-flex rounded-full bg-white p-1 ring-1 ring-border">
        {[false, true].map((y) => (
          <button
            key={String(y)}
            type="button"
            role="radio"
            aria-checked={yearly === y}
            onClick={() => setYearly(y)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              yearly === y ? "bg-[var(--ink)] text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {y ? t.billingYearly : t.billingMonthly}
            {y && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${yearly ? "bg-[var(--seat-on)] text-[var(--ink)]" : "bg-brand-soft text-brand"}`}>
                {t.yearlyBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {plans.map((p, i) => (
          <div key={p.name} className={`flex flex-col rounded-[24px] p-8 ${i === 0 ? "border border-border bg-white" : "bg-brand-soft"}`}>
            <h3 className="font-display text-xl font-bold text-[var(--ink)]">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.text}</p>
            <p className="mt-6 font-display text-[var(--ink)]">
              <span className="text-5xl font-extrabold tracking-[-0.03em] tabular-nums">{num(yearly ? p.price * 10 : p.price)}</span>{" "}
              <span className="text-base font-medium text-muted">{yearly ? t.perYear : t.perMonth}</span>
            </p>
            <p className="mt-1 h-5 text-sm text-muted">
              {yearly ? t.yearlyEquals.replace("{amount}", num((p.price * 10) / 12)) : t.monthlyNote}
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
              {p.addon && (
                <li className="flex gap-2.5 text-muted">
                  <span aria-hidden className="text-brand">
                    +
                  </span>
                  {p.addon}
                </li>
              )}
            </ul>
            <div className="mt-8">
              <Link
                href="/registrer"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                {t.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
