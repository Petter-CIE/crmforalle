"use client";

import { useActionState, useState } from "react";
import { BrregSearch, type BrregTexts } from "@/components/brreg-search";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { BrregCompany } from "@/lib/brreg";
import { createWorkspace, type OnboardingState } from "./actions";

type Texts = {
  yourName: string;
  namePlaceholder: string;
  findCompany: string;
  findHelp: string;
  companyName: string;
  orgNumberOptional: string;
  submit: string;
  submitting: string;
  trialNote: string;
};

export function OnboardingForm({
  defaultFullName,
  t,
  brreg,
}: {
  defaultFullName: string;
  t: Texts;
  brreg: BrregTexts;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createWorkspace, {});
  const [company, setCompany] = useState<{ name: string; org: string; city?: string | null }>({
    name: "",
    org: "",
  });

  function pick(c: BrregCompany) {
    setCompany({ name: c.name, org: c.orgNumber, city: c.city });
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="full_name">{t.yourName}</Label>
        <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaultFullName} placeholder={t.namePlaceholder} />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">{t.findCompany}</span>
        <BrregSearch onSelect={pick} t={brreg} autoFocus />
        <p className="mt-1 text-xs text-muted">{t.findHelp}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <div>
          <Label htmlFor="name">{t.companyName}</Label>
          <Input
            id="name"
            name="name"
            required
            value={company.name}
            onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="org_number">{t.orgNumberOptional}</Label>
          <Input
            id="org_number"
            name="org_number"
            inputMode="numeric"
            value={company.org}
            onChange={(e) => setCompany((c) => ({ ...c, org: e.target.value }))}
            placeholder="123456789"
          />
        </div>
      </div>
      {company.city && <p className="-mt-3 text-xs text-muted">{company.city}</p>}

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
      <p className="text-center text-xs text-muted">{t.trialNote}</p>
    </form>
  );
}
