// Turns a campaign (plain text with {variables}) into the e-mail one recipient gets.
// Used by the sender and by the preview in the editor, so both look the same.

export type CampaignPerson = { first_name?: string | null; last_name?: string | null; company_name?: string | null };
export type CampaignFooter = { company: string; address?: string | null; unsubscribeUrl: string; unsubscribeLabel: string; why: string };

export function fillVariables(text: string, p: CampaignPerson) {
  const first = p.first_name?.trim() ?? "";
  const last = p.last_name?.trim() ?? "";
  const v: Record<string, string> = {
    fornavn: first,
    first_name: first,
    etternavn: last,
    last_name: last,
    navn: [first, last].filter(Boolean).join(" "),
    name: [first, last].filter(Boolean).join(" "),
    firma: p.company_name?.trim() ?? "",
    company: p.company_name?.trim() ?? "",
  };
  return text.replace(/\{([a-zæøå_]+)\}/gi, (m, k: string) => (k.toLowerCase() in v ? v[k.toLowerCase()] : m));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escapes the text and turns web addresses into links. */
function linkify(s: string) {
  return esc(s).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (u) => `<a href="${u}" style="color:#1f6f54">${u}</a>`);
}

export function renderCampaign(subject: string, body: string, p: CampaignPerson, footer: CampaignFooter, openPixelUrl?: string) {
  const text = fillVariables(body, p).replace(/\r\n/g, "\n").trim();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px">${linkify(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const address = footer.address?.replace(/\s*\n\s*/g, ", ").trim();
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f2">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1d2b25">
<div style="background:#ffffff;border-radius:12px;padding:28px 28px 12px">${paragraphs}</div>
<p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#6b7670">${esc(footer.why)} ${esc(footer.company)}${address ? `, ${esc(address)}` : ""}.<br>
<a href="${esc(footer.unsubscribeUrl)}" style="color:#6b7670">${esc(footer.unsubscribeLabel)}</a></p>
</div>${openPixelUrl ? `<img src="${esc(openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0">` : ""}</body></html>`;
  const plain = `${text}\n\n--\n${footer.why} ${footer.company}${address ? `, ${address}` : ""}.\n${footer.unsubscribeLabel}: ${footer.unsubscribeUrl}`;
  return { subject: fillVariables(subject, p).trim(), html, text: plain };
}
