import { ActionForm } from "@/components/action-form";
import { Input, Select } from "@/components/ui";
import { Field, Textarea } from "@/components/ui-extra";
import type { FormResult } from "@/app/app/crm-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type ContactValues = {
  id?: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  notes: string | null;
};

export function ContactForm({
  action,
  initial,
  companies,
  t,
  hidden = {},
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  initial: ContactValues;
  companies: { id: string; name: string }[];
  t: Dictionary;
  hidden?: Record<string, string>;
}) {
  const c = t.contacts;
  return (
    <ActionForm action={action} submitLabel={t.crm.save} pendingLabel={t.crm.saving}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${c.firstName} *`} htmlFor="k_first">
          <Input id="k_first" name="first_name" required defaultValue={initial.first_name} autoFocus />
        </Field>
        <Field label={c.lastName} htmlFor="k_last">
          <Input id="k_last" name="last_name" defaultValue={initial.last_name ?? ""} />
        </Field>
        <Field label={c.email} htmlFor="k_email">
          <Input id="k_email" name="email" type="email" defaultValue={initial.email ?? ""} />
        </Field>
        <Field label={c.phone} htmlFor="k_phone">
          <Input id="k_phone" name="phone" type="tel" defaultValue={initial.phone ?? ""} />
        </Field>
        <Field label={c.jobTitle} htmlFor="k_title">
          <Input id="k_title" name="title" defaultValue={initial.title ?? ""} />
        </Field>
        <Field label={c.company} htmlFor="k_company">
          <Select id="k_company" name="company_id" defaultValue={initial.company_id ?? ""} className="w-full">
            <option value="">{c.noCompany}</option>
            {companies.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t.crm.notes} htmlFor="k_notes">
        <Textarea id="k_notes" name="notes" rows={3} defaultValue={initial.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}
