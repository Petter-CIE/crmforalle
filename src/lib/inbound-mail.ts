import type { AddressObject } from "mailparser";

/** Where the CRM addresses live: a subdomain whose MX points to Brevo, so allseats.no itself can stay in Microsoft 365. */
export const DOMAIN = (process.env.INBOUND_DOMAIN ?? "inn.allseats.no").toLowerCase();
const esc = (d: string) => d.replace(/\./g, "\\.");
// Old addresses (crm-…@allseats.no) are still recognised, e.g. when they show up in forwarded headers.
const ADDRESS = new RegExp(`crm-([a-z0-9]{10})@(?:${esc(DOMAIN)}|allseats\\.no)\\b`, "gi");

export function addresses(a: AddressObject | AddressObject[] | undefined) {
  const list = Array.isArray(a) ? a : a ? [a] : [];
  return list.flatMap((o) => o.value).map((v) => ({ email: (v.address ?? "").toLowerCase(), name: v.name || null }));
}

/** Our tokens, from visible recipients and the delivery headers (a BCC only shows up there). */
export function tokensOf(raw: string) {
  const end = raw.search(/\r?\n\r?\n/);
  const head = end > 0 ? raw.slice(0, end) : raw.slice(0, 20000);
  return [...new Set([...head.matchAll(ADDRESS)].map((m) => m[1].toLowerCase()))];
}

/** Our tokens from a list of addresses (Brevo gives the envelope recipients, BCC included, as a list). */
export function tokensFromAddresses(list: string[]) {
  return [...new Set(list.flatMap((a) => [...a.matchAll(ADDRESS)].map((m) => m[1].toLowerCase())))];
}

/** "From: Name <a@b.no>" / "Fra: …" line of a forwarded message. */
export function forwardedFrom(text: string) {
  const m = text.match(/^\s*(?:\*?\s*)(?:From|Fra|Von|Od|De|Från)\s*:\s*\*?\s*(.+)$/im);
  const e = m?.[1].match(/[^\s<>"'()[\]:;,]+@[^\s<>"'()[\]:;,]+\.[a-z]{2,}/i);
  return e ? e[0].toLowerCase() : null;
}

export function htmlToText(html: string) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

