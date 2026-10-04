export const VAT_RATES = [25, 15, 12, 0] as const;
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type QuoteLine = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
  product_id?: string | null;
};

/** Everything needed to show or print a quote (same shape as the quote_public RPC). */
export type QuoteDocument = {
  number: number;
  title: string;
  status: QuoteStatus;
  valid_until: string | null;
  intro: string | null;
  terms: string | null;
  sent_at: string | null;
  responded_at: string | null;
  responder_name: string | null;
  total_ex_vat: number;
  total_vat: number;
  total: number;
  seller: {
    name: string;
    org_number: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    bank_account: string | null;
    logo_path?: string | null;
  };
  contact_person: { name: string; email: string } | null;
  customer: { company: string | null; org_number: string | null; address: string | null; contact: string | null };
  lines: QuoteLine[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineNet(l: QuoteLine) {
  return round2(l.quantity * l.unit_price * (1 - l.discount_percent / 100));
}

export function quoteTotals(lines: QuoteLine[]) {
  let exVat = 0;
  let vat = 0;
  const byRate = new Map<number, number>();
  for (const l of lines) {
    const net = lineNet(l);
    const v = round2((net * l.vat_rate) / 100);
    exVat += net;
    vat += v;
    byRate.set(l.vat_rate, round2((byRate.get(l.vat_rate) ?? 0) + v));
  }
  exVat = round2(exVat);
  vat = round2(vat);
  return { exVat, vat, total: round2(exVat + vat), byRate: [...byRate.entries()].filter(([r]) => r > 0).sort((a, b) => b[0] - a[0]) };
}

/** Validates the editor's JSON lines. Returns null when anything is off. */
export function parseLines(raw: unknown): QuoteLine[] | null {
  let data: unknown;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length > 200) return null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")));
  const out: QuoteLine[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") return null;
    const r = item as Record<string, unknown>;
    const description = String(r.description ?? "").trim().slice(0, 500);
    if (!description) continue;
    const quantity = num(r.quantity);
    const unitPrice = num(r.unit_price);
    const discount = num(r.discount_percent || 0);
    const vat = num(r.vat_rate);
    if (![quantity, unitPrice, discount].every(Number.isFinite) || quantity < 0 || quantity > 1e8 || unitPrice < 0 || unitPrice > 1e11) return null;
    if (discount < 0 || discount > 100 || !(VAT_RATES as readonly number[]).includes(vat)) return null;
    out.push({
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      unit: String(r.unit ?? "stk").trim().slice(0, 20) || "stk",
      unit_price: round2(unitPrice),
      discount_percent: round2(discount),
      vat_rate: vat,
      product_id: typeof r.product_id === "string" && uuid.test(r.product_id) ? r.product_id : null,
    });
  }
  return out;
}

export function nok(v: number, locale = "nb-NO") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "NOK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

export function qty(v: number, locale = "nb-NO") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(v);
}

export function osloDate(iso: string | null | undefined, locale = "nb-NO") {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" });
}
