import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { lineNet, nok, osloDate, qty, quoteTotals, type QuoteDocument } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/server";
import { RespondForm } from "./respond-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicQuotePage({ params }: PageProps<"/tilbud/[token]">) {
  const { token } = await params;
  const { t, dateLocale } = await getI18n();
  const q = t.quotes;
  const supabase = await createClient();
  const { data } = /^[0-9a-f]{36}$/.test(token) ? await supabase.rpc("quote_public", { p_token: token }) : { data: null };
  const doc = data as unknown as QuoteDocument | null;

  if (!doc) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <p className="max-w-sm rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">{q.notFound}</p>
      </main>
    );
  }

  const totals = quoteTotals(doc.lines.map((l) => ({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price), discount_percent: Number(l.discount_percent), vat_rate: Number(l.vat_rate) })));
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const expired = !!doc.valid_until && doc.valid_until < today;
  const s = doc.seller;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="space-y-0.5 text-sm text-muted">
            <p className="text-xl font-semibold text-brand">{s.name}</p>
            {s.address && <p>{s.address}</p>}
            {s.org_number && (
              <p>
                {q.orgNr} {s.org_number} MVA
              </p>
            )}
            {(s.email || s.phone) && <p>{[s.email, s.phone].filter(Boolean).join(" · ")}</p>}
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 self-start text-sm sm:text-right">
            <dt className="text-muted">{q.number}</dt>
            <dd className="font-semibold">{doc.number}</dd>
            {doc.sent_at && (
              <>
                <dt className="text-muted">{q.date}</dt>
                <dd>{osloDate(doc.sent_at, dateLocale)}</dd>
              </>
            )}
            {doc.valid_until && (
              <>
                <dt className="text-muted">{q.validUntil}</dt>
                <dd className={expired ? "text-danger" : ""}>{osloDate(doc.valid_until, dateLocale)}</dd>
              </>
            )}
          </dl>
        </header>

        {(doc.customer.company || doc.customer.contact) && (
          <section className="mt-8 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted">{q.to}</p>
            {doc.customer.company && <p className="font-medium">{doc.customer.company}</p>}
            {doc.customer.contact && <p>{doc.customer.contact}</p>}
            {doc.customer.address && <p className="text-muted">{doc.customer.address}</p>}
          </section>
        )}

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">{doc.title}</h1>
        {doc.intro && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{doc.intro}</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 font-medium">{q.description}</th>
                <th className="pb-2 text-right font-medium">{q.quantity}</th>
                <th className="pb-2 text-right font-medium">{q.price}</th>
                <th className="pb-2 text-right font-medium">{q.vat}</th>
                <th className="pb-2 text-right font-medium">{q.lineSum}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doc.lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-2 pr-3 whitespace-pre-wrap">
                    {l.description}
                    {Number(l.discount_percent) > 0 && <span className="block text-xs text-muted">−{qty(Number(l.discount_percent), dateLocale)} %</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {qty(Number(l.quantity), dateLocale)} {l.unit}
                  </td>
                  <td className="py-2 text-right tabular-nums">{nok(Number(l.unit_price), dateLocale)}</td>
                  <td className="py-2 text-right tabular-nums">{Number(l.vat_rate)} %</td>
                  <td className="py-2 text-right tabular-nums">
                    {nok(lineNet({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price), discount_percent: Number(l.discount_percent) }), dateLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{q.sumExVat}</dt>
            <dd className="tabular-nums">{nok(totals.exVat, dateLocale)}</dd>
          </div>
          {totals.byRate.map(([rate, v]) => (
            <div key={rate} className="flex justify-between">
              <dt className="text-muted">{q.vatAmount(rate)}</dt>
              <dd className="tabular-nums">{nok(v, dateLocale)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
            <dt>{q.totalIncVat}</dt>
            <dd className="tabular-nums">{nok(totals.total, dateLocale)}</dd>
          </div>
        </dl>

        {doc.terms && (
          <section className="mt-8 text-sm">
            <h2 className="font-medium">{q.terms}</h2>
            <p className="mt-1 whitespace-pre-wrap text-muted">{doc.terms}</p>
          </section>
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
          <span>
            {doc.contact_person && `${q.contactPerson}: ${doc.contact_person.name} (${doc.contact_person.email})`}
            {s.bank_account && ` · ${t.quotes.bankAccount} ${s.bank_account}`}
          </span>
          <a href={`/tilbud/${token}/pdf`} target="_blank" rel="noopener" className="font-medium text-brand hover:underline">
            {q.pdf}
          </a>
        </footer>
      </article>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {doc.status === "accepted" ? (
          <p className="text-sm font-medium text-brand">✓ {q.accepted(doc.responder_name ?? "")}</p>
        ) : doc.status === "rejected" ? (
          <p className="text-sm text-muted">{q.rejected(doc.responder_name ?? "")}</p>
        ) : expired ? (
          <p className="text-sm text-muted">{q.expired}</p>
        ) : (
          <RespondForm
            token={token}
            t={{ accept: q.accept, reject: q.reject, yourName: q.yourName, comment: q.comment, acceptHelp: q.acceptHelp, sending: q.sending }}
          />
        )}
      </section>
      <p className="mt-6 text-center text-xs text-muted">{q.poweredBy}</p>
    </main>
  );
}
