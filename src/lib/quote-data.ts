import "server-only";
import { contactName } from "@/lib/crm";
import type { QuoteDocument, QuoteStatus } from "@/lib/quotes";
import type { requireWorkspace } from "@/lib/session";

type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;

export const QUOTE_SELECT =
  "*, quote_lines(description, quantity, unit, unit_price, discount_percent, vat_rate, product_id, position), companies(id, name, org_number, address, postal_code, city), contacts(id, first_name, last_name, email), deals(id, title)";

/** A quote of the current company with everything needed to show, print or send it. */
export async function loadQuote(ctx: Ctx, id: string) {
  const { supabase, workspace } = ctx;
  const [{ data: q, error }, { data: ws, error: wsError }] = await Promise.all([
    supabase.from("quotes").select(QUOTE_SELECT).eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    supabase
      .from("workspaces")
      .select("name, org_number, quote_address, quote_email, quote_phone, quote_bank_account, quote_terms, quote_valid_days")
      .eq("id", workspace.id)
      .single(),
  ]);
  if (error || wsError) console.error("loadQuote failed", (error ?? wsError)?.message);
  if (!q || !ws) return null;
  const { data: author } = q.created_by
    ? await supabase.from("profiles").select("full_name, email").eq("id", q.created_by).maybeSingle()
    : { data: null };
  const c = q.companies;
  const lines = [...(q.quote_lines ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price), discount_percent: Number(l.discount_percent), vat_rate: Number(l.vat_rate) }));
  const doc: QuoteDocument = {
    number: q.number,
    title: q.title,
    status: q.status as QuoteStatus,
    valid_until: q.valid_until,
    intro: q.intro,
    terms: q.terms,
    sent_at: q.sent_at,
    responded_at: q.responded_at,
    responder_name: q.responder_name,
    total_ex_vat: Number(q.total_ex_vat),
    total_vat: Number(q.total_vat),
    total: Number(q.total),
    seller: {
      name: ws.name,
      org_number: ws.org_number,
      address: ws.quote_address,
      email: ws.quote_email,
      phone: ws.quote_phone,
      bank_account: ws.quote_bank_account,
    },
    contact_person: author ? { name: author.full_name || author.email, email: author.email } : null,
    customer: {
      company: c?.name ?? null,
      org_number: c?.org_number ?? null,
      address: c ? [c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null : null,
      contact: q.contacts ? contactName(q.contacts) : null,
    },
    lines,
  };
  return { quote: q, doc, settings: ws };
}
