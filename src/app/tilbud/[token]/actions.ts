"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { notifyQuoteResponse } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

export type RespondState = { error?: string; done?: boolean };

/** The customer accepts or declines a quote from the public page. */
export async function respondQuote(_p: RespondState, formData: FormData): Promise<RespondState> {
  const { t } = await getI18n();
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  const accept = formData.get("answer") === "accept";
  if (!/^[0-9a-f]{36}$/.test(token)) return { error: t.quotes.notFound };
  if (name.length < 2) return { error: t.crm.required };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quote_respond", { p_token: token, p_accept: accept, p_name: name, p_comment: comment || null });
  if (error || !data) {
    if (error?.message.includes("expired")) return { error: t.quotes.expired };
    return { error: t.quotes.respondFailed };
  }
  const r = data as { number: number; title: string; quote_id: string; workspace: string; notify: string[] };
  await notifyQuoteResponse({
    to: r.notify ?? [],
    accepted: accept,
    number: r.number,
    title: r.title,
    workspace: r.workspace,
    responder: name,
    comment: comment || null,
    quoteId: r.quote_id,
  });
  revalidatePath(`/tilbud/${token}`);
  return { done: true };
}
