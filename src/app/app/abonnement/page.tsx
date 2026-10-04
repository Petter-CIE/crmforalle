import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Notice } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace, trialDaysLeft } from "@/lib/session";
import { OrderForm } from "./order-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.subscription.title };
}

export default async function SubscriptionPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const s = t.subscription;
  const { data: w } = await supabase
    .from("workspaces")
    .select("plan, billing_interval, accounting_addon, invoice_email, invoice_reference, ordered_at, trial_ends_at")
    .eq("id", workspace.id)
    .single();
  const plan = w?.plan ?? workspace.plan;
  const daysLeft = trialDaysLeft(w?.trial_ends_at ?? workspace.trial_ends_at);
  const paid = plan === "start" || plan === "bedrift";
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
            {w?.invoice_email && <p className="text-sm text-muted">{s.invoiceTo(w.invoice_email)}</p>}
            {w?.ordered_at && <p className="text-sm text-muted">{s.orderedAt(formatDate(w.ordered_at, dateLocale))}</p>}
          </div>
        )}
      </Card>
      {plan !== "free" &&
        (canManage(workspace.role) ? (
          <Card>
            <h2 className="mb-4 font-semibold">{paid ? s.change : s.choose}</h2>
            <OrderForm
              locale={dateLocale}
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
