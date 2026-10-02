import type { PlanType } from "@/lib/database.types";

/** List prices in NOK per month (ex. VAT). */
export const PLAN_PRICE: Record<PlanType, number> = { trial: 0, free: 0, start: 249, bedrift: 590 };

/** Monthly price after an active discount. */
export function monthlyPrice(
  w: { plan: PlanType; discount_percent: number; discount_until: string | null; suspended_at: string | null },
  todayIso: string,
) {
  if (w.suspended_at) return 0;
  const base = PLAN_PRICE[w.plan];
  const active = w.discount_percent > 0 && (!w.discount_until || w.discount_until >= todayIso);
  return Math.round(active ? base * (1 - w.discount_percent / 100) : base);
}

/** Default number of companies + contacts per plan. */
export const PLAN_CONTACT_LIMIT: Record<PlanType, number> = { trial: 2000, free: 25000, start: 2000, bedrift: 25000 };
