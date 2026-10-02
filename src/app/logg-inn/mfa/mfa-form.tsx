"use client";

import { useActionState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import { verifyMfa, type MfaState } from "./actions";

type Texts = { code: string; submit: string; submitting: string };

export function MfaForm({ next, t }: { next: string; t: Texts }) {
  const [state, action, pending] = useActionState<MfaState, FormData>(verifyMfa, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="neste" value={next} />
      <div>
        <Label htmlFor="code">{t.code}</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="text-center text-lg tracking-[0.4em]"
        />
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
