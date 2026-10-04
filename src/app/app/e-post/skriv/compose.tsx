"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input, Notice, Select } from "@/components/ui";
import { Textarea } from "@/components/ui-extra";
import type { FormResult } from "@/app/app/crm-actions";
import { sendEmail } from "../email-actions";

export type Recipient = { value: string; label: string; first: string; last: string; company: string };
export type Template = { id: string; name: string; subject: string; body: string };
type Texts = {
  to: string;
  template: string;
  noTemplate: string;
  subject: string;
  body: string;
  bccMe: string;
  sendBtn: string;
  sending: string;
  variablesHelp: string;
  fromInfo: string;
};

/** Fills in {fornavn}, {first_name} and the other variables. */
function fill(text: string, r: Recipient | undefined, me: { name: string; email: string; phone: string; company: string }, deal: string) {
  const v: Record<string, string> = {
    fornavn: r?.first ?? "",
    first_name: r?.first ?? "",
    etternavn: r?.last ?? "",
    last_name: r?.last ?? "",
    navn: [r?.first, r?.last].filter(Boolean).join(" "),
    name: [r?.first, r?.last].filter(Boolean).join(" "),
    firma: r?.company ?? "",
    company: r?.company ?? "",
    salg: deal,
    deal,
    mitt_navn: me.name,
    my_name: me.name,
    min_epost: me.email,
    my_email: me.email,
    min_telefon: me.phone,
    my_phone: me.phone,
    vår_bedrift: me.company,
    our_company: me.company,
  };
  return text.replace(/\{([a-zæøå_]+)\}/gi, (m, k: string) => (k.toLowerCase() in v ? v[k.toLowerCase()] : m));
}

export function Compose({
  recipients,
  templates,
  me,
  deal,
  dealId,
  back,
  t,
}: {
  recipients: Recipient[];
  templates: Template[];
  me: { name: string; email: string; phone: string; company: string };
  deal: string;
  dealId: string | null;
  back: string;
  t: Texts;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(sendEmail, {});
  const [to, setTo] = useState(recipients[0]?.value ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const recipient = useMemo(() => recipients.find((r) => r.value === to), [recipients, to]);

  function apply(id: string, r: Recipient | undefined) {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    setSubject(fill(tpl.subject, r, me, deal));
    setBody(fill(tpl.body, r, me, deal));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tilbake" value={back} />
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.to}</span>
          <Select
            name="to"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (template) apply(template, recipients.find((r) => r.value === e.target.value));
            }}
            className="w-full"
          >
            {recipients.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.template}</span>
          <Select
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              apply(e.target.value, recipient);
            }}
            className="w-full"
          >
            <option value="">{t.noTemplate}</option>
            {templates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t.subject}</span>
        <Input name="subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t.body}</span>
        <Textarea name="body" required rows={12} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <p className="text-xs text-muted">{t.variablesHelp}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="bcc_me" value="1" className="h-4 w-4 accent-[var(--brand)]" />
        {t.bccMe}
      </label>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !to}>
          {pending ? t.sending : `✉ ${t.sendBtn}`}
        </Button>
        <p className="text-xs text-muted">{t.fromInfo}</p>
      </div>
    </form>
  );
}
