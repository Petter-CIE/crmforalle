import type { ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui";
import { DuplicateWarning } from "@/components/crm/duplicate-warning";
import { ContactKindFields, type ContactKind } from "./contact-kind-fields";
import { ProjectDot } from "@/components/crm/project-dot";
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
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  marketing_consent?: boolean;
  kind?: ContactKind;
  notes: string | null;
};

export function ContactForm({
  action,
  initial,
  company,
  t,
  hidden = {},
  extra,
  projects = [],
  selectedProjects = [],
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  initial: ContactValues;
  /** Currently linked company (shown in the search field). */
  company: { id: string; label: string } | null;
  t: Dictionary;
  hidden?: Record<string, string>;
  /** Extra inputs (custom fields), rendered before the notes. */
  extra?: ReactNode;
  /** Projects to choose from, and the ones ticked. */
  projects?: { id: string; name: string; color: string | null }[];
  selectedProjects?: string[];
}) {
  const c = t.contacts;
  return (
    <ActionForm action={action} submitLabel={t.crm.save} pendingLabel={t.crm.saving}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.firstName} htmlFor="k_first">
          <Input id="k_first" name="first_name" defaultValue={initial.first_name} autoFocus />
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
      </div>
      <ContactKindFields
        company={company}
        initialKind={initial.kind ?? (initial.company_id ? "b2b" : "b2c")}
        address={{ address: initial.address ?? "", postal_code: initial.postal_code ?? "", city: initial.city ?? "" }}
        consent={initial.marketing_consent ?? false}
        isNew={!initial.id}
        t={{
          company: c.company,
          searchCompany: t.crm.searchCompany,
          noCompany: c.noCompany,
          noResults: t.crm.noResults,
          type: c.kind,
          b2b: c.kindB2b,
          b2c: c.kindB2c,
          address: c.address,
          addressHint: c.addressHint,
          street: c.street,
          postalCode: c.postalCode,
          city: c.city,
          consent: c.consent,
          consentHelp: c.consentHelp,
          consentB2c: c.consentB2c,
        }}
      />
      {projects.length > 0 && (
        <fieldset>
          <input type="hidden" name="projects_field" value="1" />
          <legend className="mb-1 text-sm font-medium">{t.projects.title}</legend>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
              >
                <input
                  type="checkbox"
                  name="project_ids"
                  value={p.id}
                  defaultChecked={selectedProjects.includes(p.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <ProjectDot color={p.color} />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {extra}
      <Field label={t.crm.notes} htmlFor="k_notes">
        <Textarea id="k_notes" name="notes" rows={3} defaultValue={initial.notes ?? ""} />
      </Field>
      <DuplicateWarning kind="contact" excludeId={initial.id} t={{ label: t.dupes.warnContact, open: t.dupes.open }} />
    </ActionForm>
  );
}
