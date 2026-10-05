"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { Field } from "@/components/ui-extra";
import { SearchSelect } from "@/components/search-select";

export type ContactKind = "b2b" | "b2c";

type Texts = {
  company: string;
  searchCompany: string;
  noCompany: string;
  noResults: string;
  type: string;
  b2b: string;
  b2c: string;
  address: string;
  street: string;
  postalCode: string;
  city: string;
  consent: string;
  consentHelp: string;
  consentB2c: string;
};

/**
 * Company, type (B2B / B2C), private address and marketing consent. Picking a company switches a
 * new contact to B2B. The address is only shown for B2C, but stays in the form so it isn't lost.
 */
export function ContactKindFields({
  company,
  initialKind,
  address,
  consent,
  isNew,
  t,
}: {
  company: { id: string; label: string } | null;
  initialKind: ContactKind;
  address: { address: string; postal_code: string; city: string };
  consent: boolean;
  isNew: boolean;
  t: Texts;
}) {
  const [kind, setKind] = useState<ContactKind>(initialKind);
  const [touched, setTouched] = useState(!isNew);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.company} htmlFor="k_company">
          <SearchSelect
            kind="company"
            id="k_company"
            name="company_id"
            defaultValue={company}
            placeholder={t.searchCompany}
            noneLabel={t.noCompany}
            emptyText={t.noResults}
            brreg
            onPick={() => {
              if (!touched) setKind("b2b");
            }}
          />
        </Field>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">{t.type}</legend>
          <div className="flex gap-2">
            {(["b2b", "b2c"] as const).map((k) => (
              <label
                key={k}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  kind === k ? "border-brand bg-brand-soft font-medium text-brand" : "border-border hover:bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setTouched(true);
                  }}
                  className="sr-only"
                />
                {k === "b2b" ? t.b2b : t.b2c}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <fieldset className={`space-y-3 ${kind === "b2c" ? "" : "hidden"}`}>
        <legend className="mb-1 text-sm font-medium">{t.address}</legend>
        <Input id="k_address" name="address" aria-label={t.street} placeholder={t.street} defaultValue={address.address} />
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <Input
            id="k_postal"
            name="postal_code"
            inputMode="numeric"
            aria-label={t.postalCode}
            placeholder={t.postalCode}
            defaultValue={address.postal_code}
          />
          <Input id="k_city" name="city" aria-label={t.city} placeholder={t.city} defaultValue={address.city} />
        </div>
      </fieldset>
      <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
        <input type="checkbox" name="marketing_consent" value="1" defaultChecked={consent} className="mt-0.5" />
        <span>
          <span className="font-medium">{t.consent}</span>
          <span className="block text-xs text-muted">{t.consentHelp}</span>
          {kind === "b2c" && <span className="mt-1 block text-xs text-muted">{t.consentB2c}</span>}
        </span>
      </label>
    </>
  );
}
