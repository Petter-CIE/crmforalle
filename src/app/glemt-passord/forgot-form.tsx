"use client";

import { useActionState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import { sendReset, type ForgotState } from "./actions";

type Texts = { email: string; emailPlaceholder: string; submit: string; submitting: string; sent: string };

export function ForgotForm({ t }: { t: Texts }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(sendReset, { status: "idle" });
  if (state.status === "sent") return <Notice tone="success">{t.sent}</Notice>;
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={t.emailPlaceholder} />
      </div>
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
