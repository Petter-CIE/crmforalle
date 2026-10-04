"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import { opt } from "@/lib/crm";
import { sendQuoteEmail } from "@/lib/notify";
import { quotePdf } from "@/lib/quote-pdf";
import { loadQuote } from "@/lib/quote-data";
import { parseLines, quoteTotals, VAT_RATES } from "@/lib/quotes";
import { getI18n } from "@/lib/i18n/server";
import { flash } from "@/lib/flash";
import { requireWorkspace, siteUrl } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: FormDataEntryValue | null) => (typeof v === "string" && UUID.test(v) ? v : null);
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

function osloToday(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function touch(id?: string, dealId?: string | null) {
  revalidatePath("/app/tilbud");
  if (id) revalidatePath(`/app/tilbud/${id}`);
  if (dealId) revalidatePath(`/app/salg/${dealId}`);
}

// ---------------------------------------------------------------- quotes
/** New draft, optionally from a deal (customer, contact and title are copied). */
export async function createQuote(formData: FormData) {
  const ctx = await requireWorkspace();
  const { supabase, workspace, user } = ctx;
  const { t } = await getI18n();
  const dealId = uuid(formData.get("deal_id"));
  const { data: ws } = await supabase.from("workspaces").select("quote_terms, quote_valid_days").eq("id", workspace.id).single();
  let deal: { id: string; title: string; company_id: string | null; contact_id: string | null } | null = null;
  if (dealId) {
    const { data } = await supabase.from("deals").select("id, title, company_id, contact_id").eq("id", dealId).eq("workspace_id", workspace.id).maybeSingle();
    deal = data;
  }
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      workspace_id: workspace.id,
      title: deal?.title ?? t.quotes.newTitle,
      deal_id: deal?.id ?? null,
      company_id: deal?.company_id ?? null,
      contact_id: deal?.contact_id ?? null,
      valid_until: osloToday(ws?.quote_valid_days ?? 30),
      terms: ws?.quote_terms ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("quote_create_failed");
  touch(undefined, deal?.id);
  await flash("created");
  redirect(`/app/tilbud/${data.id}`);
}

export async function saveQuote(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const id = uuid(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const lines = parseLines(formData.get("lines"));
  const valid = String(formData.get("valid_until") ?? "");
  if (!id || !title) return { error: t.crm.required };
  if (!lines) return { error: t.quotes.badLines };
  const { data: current } = await supabase.from("quotes").select("status, deal_id").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!current) return { error: t.crm.error };
  if (current.status === "accepted" || current.status === "rejected") return { error: t.quotes.locked };

  const totals = quoteTotals(lines);
  const { error } = await supabase
    .from("quotes")
    .update({
      title,
      valid_until: /^\d{4}-\d{2}-\d{2}$/.test(valid) ? valid : null,
      intro: opt(formData.get("intro"), 5000),
      terms: opt(formData.get("terms"), 5000),
      company_id: uuid(formData.get("company_id")),
      contact_id: uuid(formData.get("contact_id")),
      deal_id: uuid(formData.get("deal_id")),
      total_ex_vat: totals.exVat,
      total_vat: totals.vat,
      total: totals.total,
    })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) return { error: t.crm.error };
  // Replace all lines.
  const { error: delError } = await supabase.from("quote_lines").delete().eq("quote_id", id).eq("workspace_id", workspace.id);
  if (delError) return { error: t.crm.error };
  if (lines.length) {
    const { error: insError } = await supabase
      .from("quote_lines")
      .insert(lines.map((l, i) => ({ ...l, position: i, quote_id: id, workspace_id: workspace.id })));
    if (insError) return { error: t.crm.error };
  }
  touch(id, current.deal_id);
  return { ok: true };
}

export async function sendQuote(_p: FormResult, formData: FormData): Promise<FormResult> {
  const ctx = await requireWorkspace();
  const { supabase, workspace, user } = ctx;
  const { t } = await getI18n();
  const id = uuid(formData.get("id"));
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  if (!id) return { error: t.crm.error };
  if (!EMAIL.test(to) || to.length > 200) return { error: t.quotes.badEmail };
  const data = await loadQuote(ctx, id);
  if (!data) return { error: t.crm.error };
  const { quote, doc } = data;
  if (quote.status === "accepted" || quote.status === "rejected") return { error: t.quotes.locked };
  if (doc.lines.length === 0) return { error: t.quotes.noLines };

  const { data: me } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const sentAt = new Date().toISOString();
  try {
    const pdf = await quotePdf({ ...doc, sent_at: sentAt });
    await sendQuoteEmail({
      to,
      senderName: `${me?.full_name || me?.email || ""}, ${workspace.name}`.replace(/^, /, ""),
      replyTo: me?.email ?? user.email ?? "",
      subject: `Tilbud #${doc.number}: ${doc.title}`,
      message: message || t.quotes.defaultMessage,
      link: `${siteUrl()}/tilbud/${quote.public_token}`,
      pdf,
      filename: `Tilbud-${doc.number}.pdf`,
    });
  } catch (e) {
    console.error("send quote failed", e instanceof Error ? e.message : e);
    return { error: t.quotes.sendFailed };
  }
  await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: sentAt, sent_to: to })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (quote.deal_id) {
    await supabase.from("activities").insert({
      workspace_id: workspace.id,
      type: "email",
      body: `Tilbud #${doc.number} sendt til ${to}.`,
      deal_id: quote.deal_id,
      company_id: quote.company_id,
      contact_id: quote.contact_id,
      author_id: user.id,
    });
  }
  touch(id, quote.deal_id);
  return { ok: true, message: t.quotes.sentOk(to) };
}

/** Manual status change, e.g. when the customer accepted by phone. */
export async function setQuoteStatus(formData: FormData) {
  const { supabase, workspace, user } = await requireWorkspace();
  const id = uuid(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["draft", "sent", "accepted", "rejected"].includes(status)) return;
  const { data: q } = await supabase.from("quotes").select("number, deal_id, company_id, contact_id").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!q) return;
  const done = status === "accepted" || status === "rejected";
  await supabase
    .from("quotes")
    .update({ status, responded_at: done ? new Date().toISOString() : null, responder_name: null, response_comment: null })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (done && q.deal_id) {
    await supabase.from("activities").insert({
      workspace_id: workspace.id,
      type: "note",
      body: `Tilbud #${q.number} merket som ${status === "accepted" ? "akseptert" : "avslått"}.`,
      deal_id: q.deal_id,
      company_id: q.company_id,
      contact_id: q.contact_id,
      author_id: user.id,
    });
  }
  touch(id, q.deal_id);
}

// ---------------------------------------------------------------- products
function productFields(formData: FormData) {
  const price = Number(String(formData.get("unit_price") ?? "").replace(/\s/g, "").replace(",", "."));
  const vat = Number(formData.get("vat_rate"));
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 200),
    description: opt(formData.get("description"), 2000),
    sku: opt(formData.get("sku"), 60),
    unit: String(formData.get("unit") ?? "").trim().slice(0, 20) || "stk",
    unit_price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : -1,
    vat_rate: (VAT_RATES as readonly number[]).includes(vat) ? vat : 25,
  };
}

export async function createProduct(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const f = productFields(formData);
  if (!f.name || f.unit_price < 0) return { error: t.crm.required };
  const { error } = await supabase.from("products").insert({ ...f, workspace_id: workspace.id });
  if (error) return { error: t.crm.error };
  revalidatePath("/app/tilbud/produkter");
  return { ok: true };
}

export async function updateProduct(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const id = uuid(formData.get("id"));
  const f = productFields(formData);
  if (!id || !f.name || f.unit_price < 0) return { error: t.crm.required };
  const { error } = await supabase
    .from("products")
    .update({ ...f, active: formData.get("active") === "1" })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) return { error: t.crm.error };
  revalidatePath("/app/tilbud/produkter");
  return { ok: true };
}

