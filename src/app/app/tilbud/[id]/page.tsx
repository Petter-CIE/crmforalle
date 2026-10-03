import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { Button, Card, Input } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { contactName, formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { loadQuote } from "@/lib/quote-data";
import { lineNet, nok, qty, quoteTotals, type QuoteStatus } from "@/lib/quotes";
import { requireWorkspace, siteUrl } from "@/lib/session";
import { deleteQuote, sendQuote, setQuoteStatus } from "../actions";
import { StatusBadge } from "../status-badge";
import { QuoteEditor, type EditorTexts } from "./quote-editor";

export async function generateMetadata({ params }: PageProps<"/app/tilbud/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("quotes").select("number, title").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data ? `#${data.number} ${data.title}` : "" };
}

export default async function QuotePage({ params }: PageProps<"/app/tilbud/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t, dateLocale } = await getI18n();
  const q = t.quotes;
  const data = await loadQuote(ctx, id);
  if (!data) notFound();
  const { quote, doc } = data;
  const status = quote.status as QuoteStatus;
  const locked = status === "accepted" || status === "rejected";

  const [{ data: products }, { data: companies }, { data: contacts }, { data: deals }] = locked
    ? [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
    : await Promise.all([
        supabase.from("products").select("id, name, description, unit, unit_price, vat_rate").eq("workspace_id", workspace.id).eq("active", true).order("name").limit(500),
        supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name").limit(1000),
        supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name").limit(1000),
        supabase.from("deals").select("id, title").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(500),
      ]);

  const texts: EditorTexts = {
    quoteTitle: q.quoteTitle,
    validUntil: q.validUntil,
    company: q.company,
    contact: q.contact,
    deal: q.deal,
    introText: q.introText,
    introPlaceholder: q.introPlaceholder,
    terms: q.terms,
    lines: q.lines,
    description: q.description,
    quantity: q.quantity,
    unit: q.unit,
    price: q.price,
    discount: q.discount,
    vat: q.vat,
    lineSum: q.lineSum,
    addLine: q.addLine,
    chooseProduct: q.chooseProduct,
    removeLine: q.removeLine,
    sumExVat: q.sumExVat,
    vatPrefix: t.quotes.vat,
    totalIncVat: q.totalIncVat,
    save: q.save,
    saving: t.crm.saving,
    saved: q.saved,
    none: t.crm.none,
  };
  const publicLink = `${siteUrl()}/tilbud/${quote.public_token}`;
  const defaultTo = quote.sent_to ?? quote.contacts?.email ?? "";
  const totals = quoteTotals(doc.lines);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`#${quote.number} ${quote.title}`}
        backHref={quote.deal_id ? `/app/salg/${quote.deal_id}` : "/app/tilbud"}
        backLabel={quote.deals?.title ?? q.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} label={q.statuses[status]} />
            {quote.sent_at && quote.sent_to && <span>{q.sentInfo(quote.sent_to, formatDateTime(quote.sent_at, dateLocale))}</span>}
            {status === "sent" && <span>· {quote.view_count > 0 ? q.viewed(quote.view_count) : q.notViewed}</span>}
            {quote.responded_at && <span>· {q.response(quote.responder_name ?? "–", formatDateTime(quote.responded_at, dateLocale))}</span>}
          </span>
        }
        actions={
          <>
            <a href={`/app/tilbud/${id}/pdf`} target="_blank" rel="noopener" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background">
              {status === "draft" ? q.preview : q.pdf}
            </a>
          </>
        }
      />

      {quote.response_comment && (
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-sm">
          <span className="font-medium">{quote.responder_name}:</span> {quote.response_comment}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          {locked ? (
            <div className="space-y-4 text-sm">
              {doc.intro && <p className="whitespace-pre-wrap">{doc.intro}</p>}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-1 font-medium">{q.description}</th>
                      <th className="pb-1 text-right font-medium">{q.quantity}</th>
                      <th className="pb-1 text-right font-medium">{q.price}</th>
                      <th className="pb-1 text-right font-medium">{q.lineSum}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {doc.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-2">{l.description}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {qty(l.quantity, dateLocale)} {l.unit}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{nok(l.unit_price, dateLocale)}</td>
                        <td className="py-1.5 text-right tabular-nums">{nok(lineNet(l), dateLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-right font-semibold">
                {q.totalIncVat}: {nok(totals.total, dateLocale)}
              </p>
              {doc.terms && <p className="whitespace-pre-wrap text-muted">{doc.terms}</p>}
            </div>
          ) : (
            <QuoteEditor
              quote={quote}
              initialLines={doc.lines}
              products={(products ?? []).map((p) => ({ ...p, unit_price: Number(p.unit_price), vat_rate: Number(p.vat_rate) }))}
              companies={companies ?? []}
              contacts={(contacts ?? []).map((c) => ({ id: c.id, name: contactName(c) }))}
              deals={(deals ?? []).map((d) => ({ id: d.id, name: d.title }))}
              locale={dateLocale}
              readOnly={false}
              t={texts}
            />
          )}
        </Card>

        <div className="grid items-start gap-6 md:grid-cols-2">
          {!locked && (
            <Card>
              <h2 className="mb-1 font-semibold">{status === "draft" ? q.send : q.sendAgain}</h2>
              <p className="mb-3 text-xs text-muted">{q.sendHelp}</p>
              <ActionForm action={sendQuote} submitLabel={status === "draft" ? q.send : q.sendAgain} pendingLabel={q.sending} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <Field label={q.sendTo} htmlFor="s_to">
                  <Input id="s_to" name="to" type="email" required defaultValue={defaultTo} />
                </Field>
                <Field label={q.message} htmlFor="s_msg">
                  <Textarea id="s_msg" name="message" rows={5} defaultValue={q.defaultMessage} />
                </Field>
                <p className="text-xs text-muted">{q.saveFirst}</p>
              </ActionForm>
            </Card>
          )}

          {status !== "draft" && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold">{q.publicLink}</h2>
              <p className="mb-2 break-all text-xs text-muted">{publicLink}</p>
              <CopyButton value={publicLink} label={t.settings.copy} copied={t.settings.copied} />
            </Card>
          )}

          <Card>
            <div className="flex flex-wrap gap-2">
              {status === "sent" &&
                (["accepted", "rejected"] as const).map((s) => (
                  <form key={s} action={setQuoteStatus}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value={s} />
                    <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">
                      {s === "accepted" ? q.markAccepted : q.markRejected}
                    </Button>
                  </form>
                ))}
              {locked && (
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value="sent" />
                  <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">
                    {q.reopen}
                  </Button>
                </form>
              )}
              <form action={deleteQuote}>
                <input type="hidden" name="id" value={id} />
                <ConfirmButton variant="danger" className="!px-3 !py-1.5 text-xs" message={q.deleteConfirm}>
                  {q.delete}
                </ConfirmButton>
              </form>
            </div>
            {quote.deal_id && (
              <p className="mt-3 text-xs">
                <Link href={`/app/salg/${quote.deal_id}`} className="text-brand hover:underline">
                  ← {quote.deals?.title}
                </Link>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
