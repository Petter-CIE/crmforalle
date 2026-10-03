"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Input, Select } from "@/components/ui";
import { saveQuote } from "../actions";
import { lineNet, quoteTotals, VAT_RATES, type QuoteLine } from "@/lib/quotes";

type Option = { id: string; name: string };
export type ProductOption = { id: string; name: string; description: string | null; unit: string; unit_price: number; vat_rate: number };

export type EditorTexts = {
  quoteTitle: string;
  validUntil: string;
  company: string;
  contact: string;
  deal: string;
  introText: string;
  introPlaceholder: string;
  terms: string;
  lines: string;
  description: string;
  quantity: string;
  unit: string;
  price: string;
  discount: string;
  vat: string;
  lineSum: string;
  addLine: string;
  chooseProduct: string;
  removeLine: string;
  sumExVat: string;
  vatPrefix: string;
  totalIncVat: string;
  save: string;
  saving: string;
  saved: string;
  none: string;
};

type Row = { key: number; description: string; quantity: string; unit: string; unit_price: string; discount_percent: string; vat_rate: number; product_id: string | null };

const toNum = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
let nextKey = 1;

export function QuoteEditor({
  quote,
  initialLines,
  products,
  companies,
  contacts,
  deals,
  locale,
  readOnly,
  t,
}: {
  quote: {
    id: string;
    title: string;
    valid_until: string | null;
    intro: string | null;
    terms: string | null;
    company_id: string | null;
    contact_id: string | null;
    deal_id: string | null;
  };
  initialLines: QuoteLine[];
  products: ProductOption[];
  companies: Option[];
  contacts: Option[];
  deals: Option[];
  locale: string;
  readOnly: boolean;
  t: EditorTexts;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialLines.map((l) => ({
      key: nextKey++,
      description: l.description,
      quantity: String(l.quantity),
      unit: l.unit,
      unit_price: String(l.unit_price),
      discount_percent: l.discount_percent ? String(l.discount_percent) : "",
      vat_rate: l.vat_rate,
      product_id: l.product_id ?? null,
    })),
  );
  const lines: QuoteLine[] = useMemo(
    () =>
      rows.map((r) => ({
        description: r.description,
        quantity: toNum(r.quantity),
        unit: r.unit || "stk",
        unit_price: toNum(r.unit_price),
        discount_percent: toNum(r.discount_percent),
        vat_rate: r.vat_rate,
        product_id: r.product_id,
      })),
    [rows],
  );
  const totals = quoteTotals(lines.filter((l) => l.description.trim()));
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "NOK" }).format(v);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (p?: ProductOption) =>
    setRows((rs) => [
      ...rs,
      {
        key: nextKey++,
        description: p ? [p.name, p.description].filter(Boolean).join(" – ") : "",
        quantity: "1",
        unit: p?.unit ?? "stk",
        unit_price: p ? String(p.unit_price) : "",
        discount_percent: "",
        vat_rate: p?.vat_rate ?? 25,
        product_id: p?.id ?? null,
      },
    ]);

  const cell = "w-full !px-2 !py-1.5";

  return (
    <ActionForm action={saveQuote} submitLabel={t.save} pendingLabel={t.saving} successText={t.saved} className="space-y-5">
      <input type="hidden" name="id" value={quote.id} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <div>
            <label htmlFor="q_title" className="mb-1 block text-sm font-medium">
              {t.quoteTitle}
            </label>
            <Input id="q_title" name="title" required maxLength={200} defaultValue={quote.title} />
          </div>
          <div>
            <label htmlFor="q_valid" className="mb-1 block text-sm font-medium">
              {t.validUntil}
            </label>
            <Input id="q_valid" name="valid_until" type="date" defaultValue={quote.valid_until ?? ""} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["company_id", t.company, companies, quote.company_id],
              ["contact_id", t.contact, contacts, quote.contact_id],
              ["deal_id", t.deal, deals, quote.deal_id],
            ] as const
          ).map(([name, label, options, value]) => (
            <div key={name}>
              <label htmlFor={`q_${name}`} className="mb-1 block text-sm font-medium">
                {label}
              </label>
              <Select id={`q_${name}`} name={name} defaultValue={value ?? ""} className="w-full">
                <option value="">{t.none}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="q_intro" className="mb-1 block text-sm font-medium">
            {t.introText}
          </label>
          <textarea
            id="q_intro"
            name="intro"
            rows={3}
            defaultValue={quote.intro ?? ""}
            placeholder={t.introPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">{t.lines}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-1 pr-2 font-medium">{t.description}</th>
                  <th className="w-20 pb-1 pr-2 font-medium">{t.quantity}</th>
                  <th className="w-20 pb-1 pr-2 font-medium">{t.unit}</th>
                  <th className="w-28 pb-1 pr-2 font-medium">{t.price}</th>
                  <th className="w-20 pb-1 pr-2 font-medium">{t.discount}</th>
                  <th className="w-20 pb-1 pr-2 font-medium">{t.vat}</th>
                  <th className="w-28 pb-1 pr-2 text-right font-medium">{t.lineSum}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="align-top">
                    <td className="py-1 pr-2">
                      <textarea
                        aria-label={t.description}
                        rows={1}
                        value={r.description}
                        onChange={(e) => update(r.key, { description: e.target.value })}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input aria-label={t.quantity} inputMode="decimal" value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value })} className={cell} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input aria-label={t.unit} value={r.unit} maxLength={20} onChange={(e) => update(r.key, { unit: e.target.value })} className={cell} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input aria-label={t.price} inputMode="decimal" value={r.unit_price} onChange={(e) => update(r.key, { unit_price: e.target.value })} className={cell} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={t.discount}
                        inputMode="decimal"
                        value={r.discount_percent}
                        onChange={(e) => update(r.key, { discount_percent: e.target.value })}
                        className={cell}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Select aria-label={t.vat} value={r.vat_rate} onChange={(e) => update(r.key, { vat_rate: Number(e.target.value) })} className={cell}>
                        {VAT_RATES.map((v) => (
                          <option key={v} value={v}>
                            {v} %
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{money(lineNet(lines[i]))}</td>
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        aria-label={t.removeLine}
                        title={t.removeLine}
                        className="rounded px-2 py-1.5 text-muted hover:bg-background hover:text-danger"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {products.length > 0 && (
                <Select
                  aria-label={t.chooseProduct}
                  value=""
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) add(p);
                  }}
                  className="!py-1.5 text-sm"
                >
                  <option value="">{t.chooseProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} – {money(p.unit_price)}
                    </option>
                  ))}
                </Select>
              )}
              <button type="button" onClick={() => add()} className="rounded-lg px-3 py-1.5 text-sm text-brand hover:bg-brand-soft">
                {t.addLine}
              </button>
            </div>
          )}
          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.sumExVat}</dt>
              <dd className="tabular-nums">{money(totals.exVat)}</dd>
            </div>
            {totals.byRate.map(([rate, v]) => (
              <div key={rate} className="flex justify-between">
                <dt className="text-muted">
                  {t.vatPrefix} {rate} %
                </dt>
                <dd className="tabular-nums">{money(v)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
              <dt>{t.totalIncVat}</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <label htmlFor="q_terms" className="mb-1 block text-sm font-medium">
            {t.terms}
          </label>
          <textarea
            id="q_terms"
            name="terms"
            rows={3}
            defaultValue={quote.terms ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </fieldset>
    </ActionForm>
  );
}
