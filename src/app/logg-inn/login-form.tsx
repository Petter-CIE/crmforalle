"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="space-y-3">
        <Notice tone="success">
          Vi har sendt en innloggingslenke til <strong>{state.email}</strong>.
        </Notice>
        <p className="text-sm text-muted">
          Åpne e-posten på denne enheten og klikk på lenken. Finner du den ikke, sjekk søppelpost.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="neste" value={next} />
      <div>
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="navn@bedrift.no"
        />
      </div>
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sender …" : "Send innloggingslenke"}
      </Button>
      <p className="text-xs text-muted">
        Ingen passord. Har du ikke konto, opprettes den automatisk.
      </p>
    </form>
  );
}
