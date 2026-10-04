import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { lineNet, nok, osloDate, qty, quoteTotals, type QuoteDocument } from "@/lib/quotes";

const A4: [number, number] = [595.28, 841.89];
const M = 50; // margin
const BRAND = rgb(0.122, 0.435, 0.329);
const MUTED = rgb(0.44, 0.44, 0.48);
const TEXT = rgb(0.09, 0.09, 0.11);
const LINE = rgb(0.85, 0.85, 0.87);

/** The standard PDF fonts only cover Latin-1 (+ a few signs). Replace anything else so drawing never fails. */
function safe(s: string) {
  return s
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[\t\r\u2007\u2009\u202F]/g, " ")
    .replace(/\u2212/g, "-")
    .replace(/[^\n\x20-\x7E\xA0-\xFF€]/g, (c) => c.normalize("NFD").replace(/[^\x20-\x7E]/g, "") || "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) out.push(line);
        // break very long words
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
          let i = w.length;
          while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          out.push(w.slice(0, i));
          w = w.slice(i);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

/** The company logo from storage, or null (missing, unsupported format or unreachable). */
async function embedLogo(doc: PDFDocument, path: string | null | undefined) {
  if (!path || !/\.(png|jpe?g)$/i.test(path)) return null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return /\.png$/i.test(path) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function quotePdf(q: QuoteDocument) {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(`Tilbud ${q.number} - ${q.title}`));
  doc.setAuthor(safe(q.seller.name));
  doc.setCreator("AllSeats CRM");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - M;
  const width = A4[0] - 2 * M;

  const text = (s: string, x: number, yy: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right" } = {}) => {
    const size = o.size ?? 9.5;
    const f = o.f ?? font;
    const str = safe(s);
    const dx = o.align === "right" ? f.widthOfTextAtSize(str, size) : 0;
    page.drawText(str, { x: x - dx, y: yy, size, font: f, color: o.color ?? TEXT });
  };
  const ensure = (h: number) => {
    if (y - h < M + 30) {
      page = doc.addPage(A4);
      y = A4[1] - M;
    }
  };
  const paragraph = (s: string, size = 9.5, color = TEXT) => {
    for (const l of wrap(s, font, size, width)) {
      ensure(size + 4);
      text(l, M, y, { size, color });
      y -= size + 4;
    }
  };

  // Header: logo (if any) and seller left, quote facts right
  const logo = await embedLogo(doc, q.seller.logo_path);
  if (logo) {
    const scale = Math.min(150 / logo.width, 42 / logo.height, 1);
    const h = logo.height * scale;
    page.drawImage(logo, { x: M, y: y + 14 - h, width: logo.width * scale, height: h });
    text("TILBUD", A4[0] - M, y, { size: 16, f: bold, align: "right" });
    y -= Math.max(h, 18) + 4;
    text(q.seller.name, M, y, { size: 11, f: bold });
    y -= 14;
  } else {
    text(q.seller.name, M, y, { size: 16, f: bold, color: BRAND });
    text("TILBUD", A4[0] - M, y, { size: 16, f: bold, align: "right" });
    y -= 18;
  }
  const sellerLines = [
    q.seller.address,
    q.seller.org_number ? `Org.nr. ${q.seller.org_number} MVA` : null,
    [q.seller.email, q.seller.phone].filter(Boolean).join("  ·  ") || null,
  ].filter((l): l is string => !!l);
  const facts: [string, string][] = [
    ["Tilbud nr.", String(q.number)],
    ["Dato", osloDate(q.sent_at ?? new Date().toISOString())],
    ...(q.valid_until ? ([["Gyldig til", osloDate(q.valid_until)]] as [string, string][]) : []),
  ];
  const rows = Math.max(sellerLines.length, facts.length);
  for (let i = 0; i < rows; i++) {
    if (sellerLines[i]) text(sellerLines[i], M, y, { color: MUTED });
    if (facts[i]) {
      text(facts[i][0], A4[0] - M - 90, y, { color: MUTED, align: "right" });
      text(facts[i][1], A4[0] - M, y, { align: "right", f: bold });
    }
    y -= 13;
  }

  // Customer
  y -= 14;
  text("TIL", M, y, { size: 8, color: MUTED });
  y -= 13;
  const customer = [q.customer.company, q.customer.contact ? `v/ ${q.customer.contact}` : null, q.customer.address, q.customer.org_number ? `Org.nr. ${q.customer.org_number}` : null].filter(
    (l): l is string => !!l,
  );
  for (const [i, l] of customer.entries()) {
    text(l, M, y, { f: i === 0 ? bold : font });
    y -= 13;
  }

  // Title and intro
  y -= 14;
  for (const l of wrap(q.title, bold, 13, width)) {
    text(l, M, y, { size: 13, f: bold });
    y -= 17;
  }
  if (q.intro) {
    y -= 2;
    paragraph(q.intro);
  }

  // Lines table
  y -= 12;
  const cols = { desc: M, qty: M + 250, price: M + 315, disc: M + 362, vat: M + 395, sum: A4[0] - M };
  const head = () => {
    page.drawRectangle({ x: M, y: y - 5, width, height: 18, color: rgb(0.95, 0.96, 0.95) });
    text("Beskrivelse", cols.desc + 4, y, { size: 8.5, f: bold });
    text("Antall", cols.qty, y, { size: 8.5, f: bold, align: "right" });
    text("Pris", cols.price, y, { size: 8.5, f: bold, align: "right" });
    text("Rabatt", cols.disc, y, { size: 8.5, f: bold, align: "right" });
    text("MVA", cols.vat, y, { size: 8.5, f: bold, align: "right" });
    text("Sum eks. mva", cols.sum - 4, y, { size: 8.5, f: bold, align: "right" });
    y -= 20;
  };
  head();
  for (const l of q.lines) {
    const desc = wrap(l.description, font, 9, 190);
    const h = desc.length * 12 + 6;
    if (y - h < M + 30) {
      page = doc.addPage(A4);
      y = A4[1] - M;
      head();
    }
    desc.forEach((d, i) => text(d, cols.desc + 4, y - i * 12, { size: 9 }));
    text(`${qty(l.quantity)} ${l.unit}`, cols.qty, y, { size: 9, align: "right" });
    text(nok(l.unit_price).replace(/\s?kr\s?/, ""), cols.price, y, { size: 9, align: "right" });
    text(l.discount_percent ? `${qty(l.discount_percent)} %` : "", cols.disc, y, { size: 9, align: "right" });
    text(`${l.vat_rate} %`, cols.vat, y, { size: 9, align: "right" });
    text(nok(lineNet(l)), cols.sum - 4, y, { size: 9, align: "right" });
    y -= h;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: A4[0] - M, y: y + 8 }, thickness: 0.5, color: LINE });
  }

  // Totals
  const totals = quoteTotals(q.lines);
  ensure(30 + totals.byRate.length * 14 + 20);
  y -= 6;
  const total = (label: string, value: string, strong = false) => {
    text(label, cols.sum - 120, y, { align: "right", f: strong ? bold : font, size: strong ? 11 : 9.5 });
    text(value, cols.sum - 4, y, { align: "right", f: strong ? bold : font, size: strong ? 11 : 9.5 });
    y -= strong ? 18 : 14;
  };
  total("Sum eks. mva", nok(totals.exVat));
  for (const [rate, v] of totals.byRate) total(`MVA ${rate} %`, nok(v));
  total("Totalt inkl. mva", nok(totals.total), true);

  if (q.terms) {
    y -= 12;
    ensure(30);
    text("Vilkår", M, y, { f: bold });
    y -= 14;
    paragraph(q.terms, 9, MUTED);
  }

  // Footer on every page
  const footer = [
    q.contact_person ? `Kontaktperson: ${q.contact_person.name} (${q.contact_person.email})` : null,
    q.seller.bank_account ? `Kontonr. ${q.seller.bank_account}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M }, end: { x: A4[0] - M, y: M }, thickness: 0.5, color: LINE });
    if (footer) p.drawText(safe(footer), { x: M, y: M - 14, size: 8, font, color: MUTED });
    const n = `${i + 1} / ${pages.length}`;
    p.drawText(n, { x: A4[0] - M - font.widthOfTextAtSize(n, 8), y: M - 14, size: 8, font, color: MUTED });
  });

  return doc.save();
}
