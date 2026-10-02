"use client";

import { useActionState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { PasswordState } from "@/app/nytt-passord/actions";

type Texts = {
  password: string;
  confirm: string;
  passwordHelp: string;
  submit: string;
  submitting: string;
  saved: string;
};

export function PasswordForm({
  action: serverAction,
  next,
  t,
}: {
  action: (prev: PasswordState, formData: FormData) => Promise<PasswordState>;
  next?: string;
  t: Texts;
}) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(serverAction, {});
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="neste" value={next} />}
      <div>
        <Label htmlFor="password">{t.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">{t.passwordHelp}</p>
      </div>
      <div>
        <Label htmlFor="confirm">{t.confirm}</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{t.saved}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
