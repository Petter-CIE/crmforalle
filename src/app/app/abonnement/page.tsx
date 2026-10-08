import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Notice } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, trialDaysLeft } from "@/lib/session";
import { ACCOUNTING_ADDON_PRICE, CONTACT_PACK, MONTHS_PAID_PER_YEAR, OUTLOOK_ADDON_PRICE, PLAN_PRICE } from "@/lib/pricing";
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
    .select("plan, billing_interval, accounting_addon, outlook_addon, invoice_email, invoice_reference, ordered_at, trial_ends_at, payment_method, card_status, card_period_end, stripe_customer_id, stripe_subscription_id, pilot_at, extra_contact_packs")
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
  // The landing page lists the plans in this order in every language (the name is translated).
  const PLAN_INDEX = { start: 0, bedrift: 1 } as const;
  const planText = (k: "start" | "bedrift") => t.landing.plans[PLAN_INDEX[k]];
  const planName = (k: string) => (k === "start" || k === "bedrift" ? planText(k).name : k);

  // Summary at the top: plan, add-ons, list price and the next payment.
  const kr = (n: number) => new Intl.NumberFormat(dateLocale).format(n);
  const yearly = w?.billing_interval === "year";
  const addons = paid
    ? [
        (plan === "bedrift" || w?.accounting_addon) && `${s.addonAccounting}${plan === "bedrift" ? ` (${s.compareValues.included.toLowerCase()})` : ""}`,
        (plan === "bedrift" || w?.outlook_addon) && `${s.addonOutlook}${plan === "bedrift" ? ` (${s.compareValues.included.toLowerCase()})` : ""}`,
      ].filter((a): a is string => !!a)
    : [];
  let price: string | null = null;
  if (paid) {
    let month = PLAN_PRICE[plan];
    if (plan === "start" && w?.accounting_addon) month += ACCOUNTING_ADDON_PRICE;
    if (plan === "start" && w?.outlook_addon) month += OUTLOOK_ADDON_PRICE;
    month += (w?.extra_contact_packs ?? 0) * (CONTACT_PACK[plan]?.price ?? 0);
    price = yearly ? s.priceYear(kr(month * MONTHS_PAID_PER_YEAR)) : s.priceMonth(kr(month));
  }
  const next = byCard && !endsAt && w?.card_period_end ? formatDate(w.card_period_end, dateLocale) : null;
  const summary: { label: string; value: string; note?: string; danger?: boolean }[] =
    plan === "trial"
      ? [
          { label: s.summaryPlan, value: s.summaryTrial },
          { label: s.summaryPrice, value: s.priceTrial },
          {
            label: s.trialEnds,
            value: w?.trial_ends_at ? formatDate(w.trial_ends_at, dateLocale) : "–",
            note: daysLeft > 0 ? s.trialLeft(daysLeft) : s.trialOver,
            danger: daysLeft <= 0,
          },
        ]
      : plan === "free"
        ? [{ label: s.summaryPlan, value: s.free }]
        : [
            { label: s.summaryPlan, value: `${planName(plan)} · ${yearly ? s.yearly : s.monthly}` },
            { label: s.summaryAddons, value: addons.length ? addons.join(", ") : s.noAddons },
            { label: s.summaryPrice, value: price ?? "–", note: w?.pilot_at ? s.pilotPrice : undefined },
            byCard
              ? { label: s.nextPayment, value: endsAt ? "–" : (next ?? "–") }
              : { label: s.nextInvoice, value: w?.invoice_email ?? "–" },
          ];

  // Start vs Bedrift, with the rows that differ.
  const v = s.compareValues;
  const r = s.compareRows;
  const compare: [string, string, string][] = [
    [r.price, v.perMonth(kr(PLAN_PRICE.start)), v.perMonth(kr(PLAN_PRICE.bedrift))],
    [r.contacts, v.startContacts, v.bedriftContacts],
    [r.pipelines, v.startPipelines, v.bedriftPipelines],
    [r.automations, v.no, v.yes],
    [r.projectAccess, v.no, v.yes],
    [r.accounting, v.addon(kr(ACCOUNTING_ADDON_PRICE)), v.included],
    [r.outlook, v.addon(kr(OUTLOOK_ADDON_PRICE)), v.included],
    [r.campaigns, v.startCampaigns, v.bedriftCampaigns],
  ];
  const highlight = (k: "start" | "bedrift") => (plan === k ? "bg-brand-soft/60" : "");

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} subtitle={s.intro} />
      <Card>
        <h2 className="mb-3 text-sm font-semibold">{s.current}</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="mt-0.5 font-medium break-words">{item.value}</dd>
              {item.note && <dd className={`mt-0.5 text-xs ${item.danger ? "font-medium text-danger" : "text-muted"}`}>{item.note}</dd>}
            </div>
          ))}
        </dl>
        {paid && (
          <div className="mt-4 space-y-0.5 border-t border-border pt-3">
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
      {plan !== "free" && (
        <Card>
          <h2 className="mb-1 font-semibold">{s.compareTitle}</h2>
          <p className="mb-4 text-sm text-muted">{s.compareIntro}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 font-medium text-muted" />
                  {(["start", "bedrift"] as const).map((k) => (
                    <th key={k} className={`rounded-t-lg px-3 py-2 font-semibold ${highlight(k)}`}>
                      {planText(k).name}
                      {plan === k && <span className="ml-1.5 text-xs font-normal text-brand">· {s.compareCurrent}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map(([label, start, bedrift]) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-muted">{label}</td>
                    <td className={`px-3 py-2 ${highlight("start")}`}>{start}</td>
                    <td className={`px-3 py-2 font-medium ${highlight("bedrift")}`}>{bedrift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {w?.pilot_at && <Notice>⭐ {t.pilot.inApp}</Notice>}
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
              // Pilot customers are invoiced (the 50 % discount is applied on the invoice).
              cardEnabled={cardPaymentsEnabled() && !w?.pilot_at}
              plans={(["start", "bedrift"] as const).map((key) => {
                const p = planText(key);
                return { key, name: p.name, text: p.text, items: p.items };
              })}
              initial={{
                plan: plan === "bedrift" ? "bedrift" : "start",
                interval: w?.billing_interval === "year" || w?.pilot_at ? "year" : "month",
                addon: !!w?.accounting_addon,
                outlook: !!w?.outlook_addon,
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
                outlookAddon: s.outlookAddon,
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
