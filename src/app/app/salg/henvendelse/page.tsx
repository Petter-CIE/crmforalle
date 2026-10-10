import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Select } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { SearchSelect } from "@/components/search-select";
import { createInquiry } from "@/app/app/crm-actions";
import { contactName } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { loadDealOptions } from "../options";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.deals.inquiry.title };
}

/** "SV: Re: Fwd: Pristilbud skilt" → "Pristilbud skilt" */
function cleanSubject(s: string | null | undefined) {
  return (s ?? "").replace(/^(\s*(re|sv|vs|aw|fw|fwd|vb|tr)\s*:\s*)+/i, "").trim().slice(0, 200);
}

/**
 * One form for a new inquiry: who it is, which company (optional) and what it is about.
 * Can be started from an e-mail on a timeline (?aktivitet=) or one waiting under E-post (?innkommende=).
 */
export default async function NewInquiryPage({ searchParams }: PageProps<"/app/salg/henvendelse">) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t } = await getI18n();
  const q = t.deals.inquiry;
  const ws = workspace.id;
  const activityId = uuid(str(sp.aktivitet));
  const inboundId = uuid(str(sp.innkommende));

  const options = await loadDealOptions(ctx);
  const firstOpen = options.stages.find((s) => s.open);

  let contact: { id: string; label: string } | null = null;
  let company: { id: string; label: string } | null = null;
  let prefill = { name: str(sp.navn) ?? "", email: str(sp.epost) ?? "", title: "", fromEmail: "" };
  let back = "/app/salg";

  if (activityId) {
    const { data: a } = await supabase
      .from("activities")
      .select("id, body, contact_id, company_id, contacts(id, first_name, last_name), companies(id, name)")
      .eq("id", activityId)
      .eq("workspace_id", ws)
      .eq("type", "email")
      .maybeSingle();
    if (a) {
      if (a.contacts) contact = { id: a.contacts.id, label: contactName(a.contacts) };
      if (a.companies) company = { id: a.companies.id, label: a.companies.name };
      const subject = (a.body ?? "").split("\n")[0];
      prefill = { ...prefill, title: cleanSubject(subject), fromEmail: subject };
      back = a.contact_id ? `/app/kontakter/${a.contact_id}` : a.company_id ? `/app/bedrifter/${a.company_id}` : back;
    }
  } else if (inboundId) {
    const { data: e } = await supabase
      .from("inbound_emails")
      .select("id, from_email, from_name, external_emails, subject")
      .eq("id", inboundId)
      .eq("workspace_id", ws)
      .maybeSingle();
    if (e) {
      const who = e.external_emails[0] ?? e.from_email;
      prefill = {
        name: who === e.from_email ? (e.from_name ?? "") : "",
        email: who,
        title: cleanSubject(e.subject),
        fromEmail: e.subject || who,
      };
      back = "/app/e-post";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={q.title} subtitle={q.intro} backHref={back} backLabel={t.crm.back} />
      <Card>
        {prefill.fromEmail && (
          <p className="mb-4 rounded-lg bg-background px-3 py-2 text-sm text-muted">
            ✉️ {q.fromEmail}: <span className="text-foreground">{prefill.fromEmail}</span>
          </p>
        )}
        <ActionForm action={createInquiry} submitLabel={q.save} pendingLabel={t.crm.saving}>
          {activityId && <input type="hidden" name="activity_id" value={activityId} />}
          {inboundId && <input type="hidden" name="inbound_id" value={inboundId} />}

          {contact ? (
            <Field label={q.contact} htmlFor="i_contact">
              <SearchSelect
                kind="contact"
                id="i_contact"
                name="contact_id"
                defaultValue={contact}
                placeholder={t.crm.searchContact}
                emptyText={t.crm.noResults}
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={q.name} htmlFor="i_name">
                <Input id="i_name" name="name" autoComplete="off" autoFocus defaultValue={prefill.name} />
              </Field>
              <Field label={q.email} htmlFor="i_email">
                <Input id="i_email" name="email" type="email" autoComplete="off" defaultValue={prefill.email} />
              </Field>
              <Field label={q.phone} htmlFor="i_phone">
                <Input id="i_phone" name="phone" type="tel" autoComplete="off" />
              </Field>
            </div>
          )}

          <Field label={q.company} htmlFor="i_company">
            <SearchSelect
              kind="company"
              id="i_company"
              name="company_id"
              brreg
              defaultValue={company}
              placeholder={t.crm.searchCompany}
              noneLabel={t.crm.none}
              emptyText={t.crm.noResults}
            />
            <p className="mt-1 text-xs text-muted">{q.companyHint}</p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={q.what} htmlFor="i_title" className="sm:col-span-2">
              <Input id="i_title" name="title" placeholder={q.whatPlaceholder} defaultValue={prefill.title} />
            </Field>
            <Field label={q.value} htmlFor="i_value">
              <Input id="i_value" name="value" inputMode="decimal" placeholder="0" />
            </Field>
          </div>

          {options.pipelines.length > 1 ? (
            <Field label={t.deals.stage} htmlFor="i_stage">
              <Select id="i_stage" name="stage_id" defaultValue={firstOpen?.id} className="w-full">
                {options.pipelines.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    {options.stages
                      .filter((s) => s.pipeline_id === p.id && s.open)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          ) : (
            firstOpen && <input type="hidden" name="stage_id" value={firstOpen.id} />
          )}

          <Field label={q.note} htmlFor="i_note">
            <Textarea id="i_note" name="note" rows={3} placeholder={q.notePlaceholder} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
