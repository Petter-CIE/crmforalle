"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { registerBrevoInbound, type InboundState } from "./actions";

export function InboundButton({ registered }: { registered: boolean }) {
  const [state, action, pending] = useActionState<InboundState, FormData>(registerBrevoInbound, {});
  return (
    <form action={action} className="mt-4 space-y-2">
      <Button type="submit" variant={registered ? "secondary" : "primary"} disabled={pending}>
        {pending ? "Registrerer …" : registered ? "Registrer webhook på nytt" : "Registrer webhook i Brevo"}
      </Button>
      {state.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
    </form>
  );
}
