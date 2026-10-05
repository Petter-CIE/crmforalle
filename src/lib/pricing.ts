import type { PlanType } from "@/lib/database.types";

/** List prices in NOK per month (ex. VAT). */
export const PLAN_PRICE: Record<PlanType, number> = { trial: 0, free: 0, start: 249, bedrift: 990 };

/** Tripletex/Fiken add-on for the Start plan (included in Bedrift). */
export const ACCOUNTING_ADDON_PRICE = 50;

/** Yearly billing: 12 months for the price of 10. */
export const MONTHS_PAID_PER_YEAR = 10;

/** Default number of companies + contacts per plan (0 = unlimited). */
export const PLAN_CONTACT_LIMIT: Record<PlanType, number> = { trial: 2000, free: 0, start: 2000, bedrift: 25000 };

/** Extra contact packs per plan: contacts per pack, NOK per month, max packs. */
export const CONTACT_PACK: Partial<Record<PlanType, { size: number; price: number; max: number }>> = {
  start: { size: 2000, price: 50, max: 2 },
  bedrift: { size: 25000, price: 250, max: 100 },
};

/** The limit that applies: base limit plus packs (0 = unlimited). Mirrors private.enforce_contact_limit. */
export function effectiveContactLimit(w: { plan: PlanType; contact_limit: number; extra_contact_packs?: number }) {
  if (w.contact_limit <= 0) return 0;
  return w.contact_limit + (w.extra_contact_packs ?? 0) * (CONTACT_PACK[w.plan]?.size ?? 0);
}

/**
 * Monthly revenue from a company after add-on, yearly billing and an active discount
 * (yearly customers are counted as 1/12 of the yearly price).
 */
export function monthlyPrice(
  w: {
    plan: PlanType;
    discount_percent: number;
    discount_until: string | null;
    suspended_at: string | null;
    billing_interval?: string;
    accounting_addon?: boolean;
    extra_contact_packs?: number;
  },
  todayIso: string,
) {
  if (w.suspended_at) return 0;
  let base = PLAN_PRICE[w.plan];
  if (w.plan === "start" && w.accounting_addon) base += ACCOUNTING_ADDON_PRICE;
  base += (w.extra_contact_packs ?? 0) * (CONTACT_PACK[w.plan]?.price ?? 0);
  if (w.billing_interval === "year") base = (base * MONTHS_PAID_PER_YEAR) / 12;
  const active = w.discount_percent > 0 && (!w.discount_until || w.discount_until >= todayIso);
  return Math.round(active ? base * (1 - w.discount_percent / 100) : base);
}
