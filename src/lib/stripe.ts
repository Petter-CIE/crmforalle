import "server-only";
import Stripe from "stripe";
import type { PlanType } from "@/lib/database.types";
import { ACCOUNTING_ADDON_PRICE, CONTACT_PACK, MONTHS_PAID_PER_YEAR, PLAN_PRICE } from "@/lib/pricing";

/** Stripe client, or null when card payments are not set up (STRIPE_SECRET_KEY missing). */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}
export const cardPaymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/** Norwegian VAT (25 %), created once in the Stripe account and reused. */
async function vatRate(stripe: Stripe) {
  const list = await stripe.taxRates.list({ active: true, limit: 100 });
  const found = list.data.find((r) => r.metadata?.allseats === "mva25");
  if (found) return found.id;
  const created = await stripe.taxRates.create({
    display_name: "MVA",
    description: "Merverdiavgift 25 %",
    percentage: 25,
    inclusive: false,
    country: "NO",
    jurisdiction: "Norge",
    metadata: { allseats: "mva25" },
  });
  return created.id;
}

/** Checkout line items for a plan (prices ex. VAT, in øre), with the add-on and extra contact packs. */
export async function lineItems(stripe: Stripe, o: { plan: Exclude<PlanType, "trial" | "free">; interval: "month" | "year"; addon: boolean; packs: number }) {
  const tax = await vatRate(stripe);
  const factor = o.interval === "year" ? MONTHS_PAID_PER_YEAR : 1;
  const recurring = { interval: o.interval } as const;
  const item = (name: string, nokPerMonth: number, quantity = 1): Stripe.Checkout.SessionCreateParams.LineItem => ({
    quantity,
    tax_rates: [tax],
    price_data: { currency: "nok", unit_amount: Math.round(nokPerMonth * factor * 100), recurring, product_data: { name } },
  });
  const items = [item(`AllSeats CRM ${o.plan === "bedrift" ? "Bedrift" : "Start"}`, PLAN_PRICE[o.plan])];
  if (o.plan === "start" && o.addon) items.push(item("Tripletex/Fiken-tillegg", ACCOUNTING_ADDON_PRICE));
  const pack = CONTACT_PACK[o.plan];
  if (pack && o.packs > 0) items.push(item(`Ekstra kontakter (+${pack.size.toLocaleString("nb-NO")})`, pack.price, o.packs));
  return items;
}

/** End of the current billing period of a subscription (moved onto the items in newer API versions). */
export function periodEnd(sub: Stripe.Subscription) {
  const s = sub as Stripe.Subscription & { current_period_end?: number };
  const end = s.items?.data?.[0]?.current_period_end ?? s.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}
