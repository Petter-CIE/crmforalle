"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";

type Texts = {
  email: string;
  emailPlaceholder: string;
  submit: string;
  sending: string;
  noPassword: string;
  sentTo: string;
  sentHelp: string;
};

export function LoginForm({ next, t }: { next: string; t: Texts }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="space-y-3">
        <Notice tone="success">
          {t.sentTo} <strong>{state.email}</strong>.
        </Notice>
        <p className="text-sm text-muted">{t.sentHelp}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="neste" value={next} />
      <div>
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder={t.emailPlaceholder}
        />
      </div>
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.sending : t.submit}
      </Button>
      <p className="text-xs text-muted">{t.noPassword}</p>
    </form>
  );
}
