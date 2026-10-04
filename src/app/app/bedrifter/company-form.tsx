"use client";

import { useState, type ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { BrregSearch, type BrregTexts } from "@/components/brreg-search";
import { DuplicateWarning } from "@/components/crm/duplicate-warning";
import { Input } from "@/components/ui";
import type { BrregCompany } from "@/lib/brreg";
import type { FormResult } from "@/app/app/crm-actions";

export type CompanyValues = {
  id?: string;
  name: string;
  org_number: string;
  address: string;
  postal_code: string;
  city: string;
  nace_code: string;
  nace_description: string;
  website: string;
  email: string;
  phone: string;
  notes: string;
};

type Texts = {
  name: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  city: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  notes: string;
  findInBrreg: string;
  brregHelp: string;
  save: string;
  saving: string;
};

export function CompanyForm({
  action,
  initial,
  t,
  brreg,
  showBrreg,
  extra,
  dup,
}: {
  /** Texts for the duplicate warning (shown when creating). */
  dup?: { label: string; open: string };
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  initial: CompanyValues;
  t: Texts;
  brreg: BrregTexts;
  showBrreg: boolean;
  /** Extra inputs (custom fields), rendered before the notes. */
  extra?: ReactNode;
}) {
  const [v, setV] = useState(initial);
  const set = (k: keyof CompanyValues) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  function pick(c: BrregCompany) {
    setV((s) => ({
      ...s,
      name: c.name,
      org_number: c.orgNumber,
      address: c.address ?? "",
      postal_code: c.postalCode ?? "",
      city: c.city ?? "",
      nace_code: c.naceCode ?? "",
      nace_description: c.naceDescription ?? "",
      website: c.website ?? s.website,
      email: c.email ?? s.email,
      phone: c.phone ?? s.phone,
    }));
  }

  const field = (k: keyof CompanyValues, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`c_${k}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input id={`c_${k}`} name={k} value={v[k] ?? ""} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <ActionForm action={action} submitLabel={t.save} pendingLabel={t.saving}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {showBrreg && (
        <div className="rounded-lg bg-brand-soft/60 p-4">
          <span className="mb-1 block text-sm font-medium">{t.findInBrreg}</span>
          <BrregSearch onSelect={pick} t={brreg} autoFocus />
          <p className="mt-1 text-xs text-muted">{t.brregHelp}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        {field("name", t.name, { required: true })}
        {field("org_number", t.orgNumber, { inputMode: "numeric" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem_1fr]">
        {field("address", t.address)}
        {field("postal_code", t.postalCode)}
        {field("city", t.city)}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("email", t.email, { type: "email" })}
        {field("phone", t.phone, { type: "tel" })}
        {field("website", t.website)}
      </div>
      <input type="hidden" name="nace_code" value={v.nace_code} />
      {field("nace_description", t.industry)}
      {extra}
      <div>
        <label htmlFor="c_notes" className="mb-1 block text-sm font-medium">
          {t.notes}
        </label>
        <textarea
          id="c_notes"
          name="notes"
          rows={3}
          value={v.notes}
          onChange={set("notes")}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {dup && <DuplicateWarning kind="company" excludeId={initial.id} t={dup} />}
    </ActionForm>
  );
}
