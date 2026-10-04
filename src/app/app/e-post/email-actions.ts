"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "@/app/app/crm-actions";
import { opt } from "@/lib/crm";
import { flash } from "@/lib/flash";
import { getI18n } from "@/lib/i18n/server";
import { sendCrmEmail } from "@/lib/notify";
import { requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAILY_LIMIT = 100;

// ---------------------------------------------------------------- templates (shared by the team)
function templateFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 80),
    subject: String(formData.get("subject") ?? "").trim().slice(0, 200),
    body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 20000),
  };
}

export async function saveTemplate(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const f = templateFields(formData);
  if (!f.name || !f.subject || !f.body) return { error: t.crm.required };
  const id = String(formData.get("id") ?? "");
  const { error } = UUID.test(id)
    ? await supabase.from("email_templates").update({ ...f, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspace.id)
    : await supabase.from("email_templates").insert({ ...f, workspace_id: workspace.id, created_by: user.id });
  if (error) return { error: t.crm.error };
  revalidatePath("/app/innstillinger/e-postmaler");
  return { ok: true, message: t.emails.templateSaved };
}

export async function deleteTemplate(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await supabase.from("email_templates").delete().eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/innstillinger/e-postmaler");
}

// ---------------------------------------------------------------- sending
/**
 * Sends an e-mail to a contact (or a company's own address) and saves it in the history.
 * The recipient must exist in the CRM – the form can't be used to e-mail arbitrary addresses.
 */
export async function sendEmail(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const e = t.emails;
  const to = String(formData.get("to") ?? "");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 20000);
  const dealId = String(formData.get("deal_id") ?? "");
  if (!subject || !body) return { error: t.crm.required };

  const [kind, id] = to.split(":");
  if (!UUID.test(id ?? "")) return { error: e.badRecipient };
  let address: string | null = null;
  let contactId: string | null = null;
  let companyId: string | null = null;
  if (kind === "contact") {
    const { data } = await supabase.from("contacts").select("id, email, company_id").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
    address = data?.email ?? null;
    contactId = data?.id ?? null;
    companyId = data?.company_id ?? null;
  } else if (kind === "company") {
    const { data } = await supabase.from("companies").select("id, email").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
    address = data?.email ?? null;
    companyId = data?.id ?? null;
  }
  if (!address) return { error: e.badRecipient };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("author_id", user.id)
    .eq("type", "email_sent")
    .gte("occurred_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return { error: e.limit };

  const { data: me } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const fromName = me?.full_name || me?.email || workspace.name;
  try {
    await sendCrmEmail({
      to: address,
      fromName: `${fromName} (${workspace.name})`,
      replyTo: me?.email ?? user.email ?? "",
      bcc: formData.get("bcc_me") === "1" ? (me?.email ?? undefined) : undefined,
      subject,
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.error("crm e-mail failed", msg);
    return { error: msg === "smtp_not_configured" ? e.notConfigured : e.failed };
  }

  const deal = UUID.test(dealId) ? dealId : null;
  await supabase.from("activities").insert({
    workspace_id: workspace.id,
    type: "email_sent",
    body: `${subject}\n\n${body}`.slice(0, 10000),
    contact_id: contactId,
    company_id: companyId,
    deal_id: deal,
    author_id: user.id,
  });

  const back = opt(formData.get("tilbake"), 300);
  const target = back && back.startsWith("/app") ? back : contactId ? `/app/kontakter/${contactId}` : `/app/bedrifter/${companyId}`;
  revalidatePath(target);
  await flash("sent");
  redirect(target);
}
