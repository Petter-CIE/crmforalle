"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { sendLoginLink, signIn, type LinkState, type LoginState } from "./actions";

type Texts = {
  email: string;
  emailPlaceholder: string;
  password: string;
  submit: string;
  submitting: string;
  forgot: string;
  or: string;
  passkey: string;
  passkeyHelp: string;
  passkeyFailed: string;
  sendLink: string;
  sendingLink: string;
  linkHelp: string;
};

export function LoginForm({ next, t }: { next: string; t: Texts }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  const [linkState, linkAction, linkPending] = useActionState<LinkState, FormData>(sendLoginLink, {});
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  async function loginWithPasskey() {
    setPasskeyError(null);
    setPasskeyBusy(true);
    const { error } = await createClient().auth.signInWithPasskey();
    setPasskeyBusy(false);
    if (error) {
      setPasskeyError(t.passkeyFailed);
      return;
    }
    // Full reload so the server sees the new session cookies (and enforces MFA if enabled).
    window.location.assign(next);
  }

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <input type="hidden" name="neste" value={next} />
        <div>
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username webauthn"
            required
            defaultValue={state.email}
            placeholder={t.emailPlaceholder}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              {t.password}
            </label>
            <Link href="/glemt-passord" className="text-xs text-brand hover:underline">
              {t.forgot}
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button type="submit" disabled={pending || linkPending} className="w-full">
          {pending ? t.submitting : t.submit}
        </Button>
        {/* Same e-mail field, no password needed: send a one-time login link instead. */}
        <div className="space-y-1 text-center">
          <button
            type="submit"
            formAction={linkAction}
            formNoValidate
            disabled={pending || linkPending}
            className="text-sm font-medium text-brand hover:underline disabled:opacity-60"
          >
            ✉️ {linkPending ? t.sendingLink : t.sendLink}
          </button>
          <p className="text-xs text-muted">{t.linkHelp}</p>
        </div>
        {linkState.error && <Notice tone="error">{linkState.error}</Notice>}
        {linkState.sent && <Notice tone="success">{linkState.sent}</Notice>}
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t.or}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-1">
        <Button type="button" variant="secondary" className="w-full" disabled={passkeyBusy} onClick={loginWithPasskey}>
          <span aria-hidden>🔑</span> {t.passkey}
        </Button>
        <p className="text-center text-xs text-muted">{t.passkeyHelp}</p>
        {passkeyError && <Notice tone="error">{passkeyError}</Notice>}
      </div>
    </div>
  );
}
