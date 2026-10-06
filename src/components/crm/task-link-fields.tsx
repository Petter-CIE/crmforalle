"use client";

import { useCallback, useState } from "react";
import { SearchSelect } from "@/components/search-select";
import { Field } from "@/components/ui-extra";

type Choice = { id: string; label: string } | null;

/**
 * Company and contact pickers for a task. Once a company is chosen, the contact picker only
 * offers that company's contacts, and a contact from another company is cleared.
 */
export function TaskLinkFields({
  t,
  initialCompany = null,
  initialContact = null,
  wrap,
  className = "",
}: {
  t: { pickCompany: string; pickContact: string; noLink: string; noMatches: string; company?: string; contact?: string };
  initialCompany?: Choice;
  initialContact?: Choice;
  /** Labelled rows (task details) instead of inline fields (new-task form). */
  wrap?: boolean;
  className?: string;
}) {
  const [company, setCompany] = useState<string | null>(initialCompany?.id ?? null);
  // the original contact is only kept while the original company is still chosen
  const touched = company !== (initialCompany?.id ?? null);
  const onCompany = useCallback((c: Choice) => setCompany(c?.id ?? null), []);

  const companyPicker = (
    <SearchSelect
      kind="company"
      id="t_company"
      name="company_id"
      defaultValue={initialCompany}
      placeholder={t.pickCompany}
      noneLabel={t.noLink}
      emptyText={t.noMatches}
      onChange={onCompany}
      className={className}
    />
  );
  const contactPicker = (
    <SearchSelect
      // a new company starts the contact choice afresh
      key={company ?? "none"}
      kind="contact"
      id="t_contact"
      name="contact_id"
      company={company}
      defaultValue={touched ? null : initialContact}
      placeholder={t.pickContact}
      noneLabel={t.noLink}
      emptyText={t.noMatches}
      className={className}
    />
  );

  if (!wrap) {
    return (
      <>
        {companyPicker}
        {contactPicker}
      </>
    );
  }
  return (
    <>
      <Field label={t.company ?? ""} htmlFor="t_company">
        {companyPicker}
      </Field>
      <Field label={t.contact ?? ""} htmlFor="t_contact">
        {contactPicker}
      </Field>
    </>
  );
}
