"use client";

import { useActionState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import { register, type RegisterState } from "./actions";

type Texts = {
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordHelp: string;
  submit: string;
  submitting: string;
  sentTitle: string;
  sentTo: string;
  sentHelp: string;
};

export function RegisterForm({ t }: { t: Texts }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="space-y-3">
        <Notice tone="success">
          <strong>{t.sentTitle}</strong>
          <br />
          {t.sentTo} <strong>{state.email}</strong>.
        </Notice>
        <p className="text-sm text-muted">{t.sentHelp}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder={t.emailPlaceholder} />
      </div>
      <div>
        <Label htmlFor="password">{t.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">{t.passwordHelp}</p>
      </div>
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
