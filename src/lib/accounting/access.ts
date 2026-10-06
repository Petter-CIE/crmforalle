import type { PlanType } from "@/lib/database.types";

/** Accounting integrations: included in Bedrift, an add-on on Start; open during the trial. */
export function hasAccountingAccess(w: { plan: PlanType; accounting_addon?: boolean | null }) {
  return w.plan === "bedrift" || w.plan === "trial" || w.plan === "free" || (w.plan === "start" && !!w.accounting_addon);
}

export const PROVIDERS = ["tripletex", "fiken"] as const;
export type Provider = (typeof PROVIDERS)[number];
