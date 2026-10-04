import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Notice } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, trialDaysLeft } from "@/lib/session";
import { cardPaymentsEnabled, getStripe } from "@/lib/stripe";
import { openBillingPortal } from "./actions";
import { OrderForm } from "./order-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.subscription.title };
}

export default async function SubscriptionPage({ searchParams }: PageProps<"/app/abonnement">) {
  const sp = await searchParams;
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const s = t.subscription;
  const { data: w } = await supabase
    .from("workspaces")
    .select("plan, billing_interval, accounting_addon, invoice_email, invoice_reference, ordered_at, trial_ends_at, payment_method, card_status, card_period_end, stripe_customer_id, stripe_subscription_id")
    .eq("id", workspace.id)
    .single();
  const plan = w?.plan ?? workspace.plan;
  const daysLeft = trialDaysLeft(w?.trial_ends_at ?? workspace.trial_ends_at);
  const paid = plan === "start" || plan === "bedrift";
  const byCard = paid && w?.payment_method === "card";
  const cardTrouble = byCard && !!w?.card_status && !["active", "trialing"].includes(w.card_status);
  // Cancelled in the card portal but still running to the end of the period: ask Stripe directly,
  // so the page shows it right after the user comes back from the portal.
  let endsAt: string | null = null;
  const stripe = byCard && w?.stripe_subscription_id ? getStripe() : null;
  if (stripe && w?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(w.stripe_subscription_id);
      const end = sub.cancel_at ?? (sub.cancel_at_period_end ? (sub.items.data[0]?.current_period_end ?? null) : null);
      if (end && sub.status !== "canceled") endsAt = new Date(end * 1000).toISOString();
    } catch {
      // Stripe unreachable: fall back to the stored status.
    }
  }
  const planName = (k: string) => t.landing.plans.find((p) => p.name.toLowerCase() === k)?.name ?? k;

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} subtitle={s.intro} />
      <Card>
        <h2 className="mb-1 text-sm font-semibold">{s.current}</h2>
        {plan === "trial" ? (
          <p className={daysLeft > 0 ? "" : "font-medium text-danger"}>{daysLeft > 0 ? s.trialLeft(daysLeft) : s.trialOver}</p>
        ) : plan === "free" ? (
          <p>{s.free}</p>
        ) : (
          <div className="space-y-0.5">
            <p className="font-medium">{s.active(planName(plan), w?.billing_interval === "year" ? s.yearly : s.monthly)}</p>
            {byCard ? (
              endsAt ? (
                <p className="text-sm font-medium text-amber-700">{s.cardEnds(formatDate(endsAt, dateLocale))}</p>
              ) : (
                <p className="text-sm text-muted">{s.paidByCard(w?.card_period_end ? formatDate(w.card_period_end, dateLocale) : null)}</p>
              )
            ) : (
              w?.invoice_email && <p className="text-sm text-muted">{s.invoiceTo(w.invoice_email)}</p>
            )}
            {w?.ordered_at && <p className="text-sm text-muted">{s.orderedAt(formatDate(w.ordered_at, dateLocale))}</p>}
          </div>
        )}
      </Card>
      {sp.betalt === "feil" && <Notice tone="error">{s.payFailed}</Notice>}
      {sp.betalt === "venter" && (
        <Notice>
          {s.payPending}{" "}
          {typeof sp.session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(sp.session_id) && (
            <a href={`/app/abonnement/stripe-retur?session_id=${encodeURIComponent(sp.session_id)}`} className="font-medium underline">
              {s.payCheckAgain}
            </a>
          )}
        </Notice>
      )}
      {sp.portal === "feil" && <Notice tone="error">{s.portalFailed}</Notice>}
      {cardTrouble && <Notice tone="error">{s.cardIssue}</Notice>}
      {w?.stripe_customer_id && canManage(workspace.role) && (
        <form action={openBillingPortal}>
          <button type="submit" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background">
            💳 {s.portal} ↗
          </button>
        </form>
      )}
      {byCard && canManage(workspace.role) && <p className="text-sm text-muted">{s.cardChange}</p>}
      {plan !== "free" &&
        !byCard &&
        (canManage(workspace.role) ? (
          <Card>
            <h2 className="mb-4 font-semibold">{paid ? s.change : s.choose}</h2>
            <OrderForm
              locale={dateLocale}
              cardEnabled={cardPaymentsEnabled()}
              plans={(["start", "bedrift"] as const).map((key) => {
                const p = t.landing.plans.find((x) => x.name.toLowerCase() === key)!;
                return { key, name: p.name, text: p.text, items: p.items };
              })}
              initial={{
                plan: plan === "bedrift" ? "bedrift" : "start",
                interval: w?.billing_interval === "year" ? "year" : "month",
                addon: !!w?.accounting_addon,
                invoiceEmail: w?.invoice_email ?? user.email ?? "",
                reference: w?.invoice_reference ?? "",
              }}
              t={{
                interval: s.interval,
                monthly: s.monthly,
                yearly: s.yearly,
                perMonth: s.perMonth,
                perYear: s.perYear,
                twoFree: s.twoFree,
                addon: s.addon,
                invoiceEmail: s.invoiceEmail,
                reference: s.reference,
                total: s.total,
                exVat: s.exVat,
                terms: s.terms,
                order: s.order,
                ordering: s.ordering,
                method: s.method,
                methodInvoice: s.methodInvoice,
                methodCard: s.methodCard,
                goToPayment: s.goToPayment,
                receiptTo: s.receiptTo,
              }}
            />
            <p className="mt-4 text-xs text-muted">
              {s.cancel} ·{" "}
              <Link href="/vilkar" className="underline">
                {s.termsLink}
              </Link>
            </p>
          </Card>
        ) : (
          <Notice>{s.onlyAdmins}</Notice>
        ))}
    </div>
  );
}
