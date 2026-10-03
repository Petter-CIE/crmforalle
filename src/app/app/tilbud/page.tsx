import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { contactName, formatDate, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/quotes";
import { canManage, requireWorkspace } from "@/lib/session";
import { createQuote } from "./actions";
import { StatusBadge } from "./status-badge";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.quotes.title };
}

export default async function QuotesPage({ searchParams }: PageProps<"/app/tilbud">) {
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const q = t.quotes;
  const sp = await searchParams;
  const status = QUOTE_STATUSES.includes(sp.status as QuoteStatus) ? (sp.status as QuoteStatus) : null;

  let query = supabase
    .from("quotes")
    .select("id, number, title, status, total, valid_until, sent_at, view_count, companies(name), contacts(first_name, last_name)")
    .eq("workspace_id", workspace.id)
    .order("number", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);
  const { data: quotes } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title={q.title}
        subtitle={q.intro}
        actions={
          <>
            <ButtonLink href="/app/tilbud/produkter" variant="secondary">
              {q.products}
            </ButtonLink>
            {canManage(workspace.role) && (
              <ButtonLink href="/app/tilbud/innstillinger" variant="secondary">
                {q.settings}
              </ButtonLink>
            )}
            <form action={createQuote}>
              <Button type="submit">+ {q.new}</Button>
            </form>
          </>
        }
      />

      <nav className="flex flex-wrap gap-1 text-sm" aria-label={q.status}>
        {[null, ...QUOTE_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/app/tilbud?status=${s}` : "/app/tilbud"}
            className={`rounded-full px-3 py-1 ${status === s ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface"}`}
          >
            {s ? q.statuses[s] : q.all}
          </Link>
        ))}
      </nav>

      {(quotes ?? []).length === 0 ? (
        <EmptyState>{q.empty}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">{q.number}</th>
                <th className="px-4 py-2 font-medium">{q.quoteTitle}</th>
                <th className="px-4 py-2 font-medium">{q.customer}</th>
                <th className="px-4 py-2 font-medium">{q.status}</th>
                <th className="px-4 py-2 font-medium">{q.validUntil}</th>
                <th className="px-4 py-2 text-right font-medium">{q.total}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(quotes ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-background">
                  <td className="px-4 py-2 tabular-nums text-muted">#{r.number}</td>
                  <td className="px-4 py-2">
                    <Link href={`/app/tilbud/${r.id}`} className="font-medium hover:text-brand">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {[r.companies?.name, r.contacts ? contactName(r.contacts) : null].filter(Boolean).join(" · ")}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status as QuoteStatus} label={q.statuses[r.status as QuoteStatus]} />
                    {r.status === "sent" && (
                      <span className="ml-2 text-xs text-muted">{r.view_count > 0 ? q.viewed(r.view_count) : q.notViewed}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDate(r.valid_until, dateLocale)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(Number(r.total), dateLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
