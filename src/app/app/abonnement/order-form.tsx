"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui";
import { ACCOUNTING_ADDON_PRICE, MONTHS_PAID_PER_YEAR, PLAN_PRICE } from "@/lib/pricing";
import { orderSubscription } from "./actions";

type Texts = {
  interval: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  twoFree: string;
  addon: string;
  invoiceEmail: string;
  reference: string;
  total: string;
  exVat: string;
  terms: string;
  order: string;
  ordering: string;
};
type Plan = { key: "start" | "bedrift"; name: string; text: string; items: string[] };

/** Plan cards, monthly/yearly, invoice address – and the live total. */
export function OrderForm({
  plans,
  initial,
  locale,
  t,
}: {
  plans: Plan[];
  initial: { plan: "start" | "bedrift"; interval: "month" | "year"; addon: boolean; invoiceEmail: string; reference: string };
  locale: string;
  t: Texts;
}) {
  const [plan, setPlan] = useState(initial.plan);
  const [interval, setInterval] = useState(initial.interval);
  const [addon, setAddon] = useState(initial.addon);
  const nok = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  const monthly = PLAN_PRICE[plan] + (plan === "start" && addon ? ACCOUNTING_ADDON_PRICE : 0);
  const total = interval === "year" ? monthly * MONTHS_PAID_PER_YEAR : monthly;

  return (
    <ActionForm action={orderSubscription} submitLabel={t.order} pendingLabel={t.ordering}>
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      <div className="inline-flex rounded-full border border-border bg-background p-1 text-sm" role="radiogroup" aria-label={t.interval}>
        {(["month", "year"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={interval === v}
            onClick={() => setInterval(v)}
            className={`rounded-full px-4 py-1.5 first-letter:uppercase ${interval === v ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
          >
            {v === "month" ? t.monthly : t.yearly}
            {v === "year" && <span className="ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">{t.twoFree}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2" role="radiogroup">
        {plans.map((p) => {
          const on = plan === p.key;
          const price = interval === "year" ? PLAN_PRICE[p.key] * MONTHS_PAID_PER_YEAR : PLAN_PRICE[p.key];
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlan(p.key)}
              className={`flex flex-col rounded-xl border p-5 text-left transition-colors ${on ? "border-brand bg-brand-soft/50 ring-2 ring-brand/30" : "border-border bg-surface hover:border-brand"}`}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{p.name}</span>
                <span className="text-sm">
                  <strong className="text-xl tabular-nums">{nok(price)}</strong> {interval === "year" ? t.perYear : t.perMonth}
                </span>
              </span>
              <span className="mt-1 block text-sm text-muted">{p.text}</span>
              <ul className="mt-3 space-y-1 text-sm">
                {p.items.map((i) => (
                  <li key={i}>✓ {i}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {plan === "start" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="addon" value="1" checked={addon} onChange={(e) => setAddon(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
          {t.addon}
        </label>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.invoiceEmail}</span>
          <Input name="invoice_email" type="email" required maxLength={200} defaultValue={initial.invoiceEmail} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.reference}</span>
          <Input name="reference" maxLength={100} defaultValue={initial.reference} />
        </label>
      </div>
      <p className="text-lg">
        {t.total}: <strong className="tabular-nums">{nok(total)} {interval === "year" ? t.perYear : t.perMonth}</strong>{" "}
        <span className="text-sm text-muted">{t.exVat}</span>
      </p>
      <p className="text-xs text-muted">{t.terms}</p>
    </ActionForm>
  );
}
