"use client";

import { useActionState, useState } from "react";
import { BrregSearch } from "@/components/brreg-search";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { BrregCompany } from "@/lib/brreg";
import { createWorkspace, type OnboardingState } from "./actions";

export function OnboardingForm({ defaultFullName }: { defaultFullName: string }) {
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
        <Label htmlFor="full_name">Ditt navn</Label>
        <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaultFullName} placeholder="Ola Nordmann" />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Finn bedriften din</span>
        <BrregSearch onSelect={pick} autoFocus />
        <p className="mt-1 text-xs text-muted">Hentes fra Brønnøysundregistrene. Du kan også fylle inn selv.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <div>
          <Label htmlFor="name">Bedriftsnavn</Label>
          <Input
            id="name"
            name="name"
            required
            value={company.name}
            onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="org_number">Org.nr. (valgfritt)</Label>
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
        {pending ? "Oppretter …" : "Opprett og start prøveperioden"}
      </Button>
      <p className="text-center text-xs text-muted">14 dager gratis. Ingen kort nødvendig.</p>
    </form>
  );
}
