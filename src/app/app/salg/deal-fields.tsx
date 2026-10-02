import { Input, Select } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { contactName } from "@/lib/crm";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type DealOptions = {
  stages: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  contacts: { id: string; first_name: string; last_name: string | null }[];
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

export function DealFields({
  t,
  options,
  initial,
}: {
  t: Dictionary;
  options: DealOptions;
  initial: {
    title?: string;
    value?: number;
    stage_id?: string;
    company_id?: string | null;
    contact_id?: string | null;
    project_id?: string | null;
    owner_id?: string | null;
    expected_close?: string | null;
  };
}) {
  const d = t.deals;
  return (
    <>
      <Field label={`${d.dealTitle} *`} htmlFor="d_title">
        <Input id="d_title" name="title" required defaultValue={initial.title} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={d.value} htmlFor="d_value">
          <Input id="d_value" name="value" inputMode="decimal" defaultValue={initial.value ? String(initial.value) : ""} placeholder="0" />
        </Field>
        <Field label={`${d.stage} *`} htmlFor="d_stage">
          <Select id="d_stage" name="stage_id" required defaultValue={initial.stage_id} className="w-full">
            {options.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.expectedClose} htmlFor="d_close">
          <Input id="d_close" name="expected_close" type="date" defaultValue={initial.expected_close ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={d.company} htmlFor="d_company">
          <Select id="d_company" name="company_id" defaultValue={initial.company_id ?? ""} className="w-full">
            <option value="">{t.crm.none}</option>
            {options.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.contact} htmlFor="d_contact">
          <Select id="d_contact" name="contact_id" defaultValue={initial.contact_id ?? ""} className="w-full">
            <option value="">{t.crm.none}</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.project} htmlFor="d_project">
          <Select id="d_project" name="project_id" defaultValue={initial.project_id ?? ""} className="w-full">
            <option value="">{t.crm.none}</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.owner} htmlFor="d_owner">
          <Select id="d_owner" name="owner_id" defaultValue={initial.owner_id ?? ""} className="w-full">
            {options.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}
