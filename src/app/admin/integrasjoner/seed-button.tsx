"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { seedTripletexTestData, type SeedState } from "./actions";

export function SeedButton() {
  const [state, action, pending] = useActionState<SeedState, FormData>(seedTripletexTestData, {});
  return (
    <form action={action} className="mt-4 space-y-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Oppretter …" : "Lag testdata i Tripletex (test)"}
      </Button>
      {state.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
    </form>
  );
}
