"use client";

import { useActionState, useState } from "react";
import { respondQuote, type RespondState } from "./actions";

export type RespondTexts = { accept: string; reject: string; yourName: string; comment: string; acceptHelp: string; sending: string };

export function RespondForm({ token, t }: { token: string; t: RespondTexts }) {
  const [state, action, pending] = useActionState<RespondState, FormData>(respondQuote, {});
  const [answer, setAnswer] = useState<"accept" | "reject">("accept");
  const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="r_name" className="mb-1 block text-sm font-medium">
          {t.yourName}
        </label>
        <input id="r_name" name="name" required minLength={2} maxLength={200} autoComplete="name" className={field} />
      </div>
      <div>
        <label htmlFor="r_comment" className="mb-1 block text-sm font-medium">
          {t.comment}
        </label>
        <textarea id="r_comment" name="comment" rows={2} maxLength={2000} className={field} />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="answer"
          value="accept"
          onClick={() => setAnswer("accept")}
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {pending && answer === "accept" ? t.sending : t.accept}
        </button>
        <button
          type="submit"
          name="answer"
          value="reject"
          onClick={() => setAnswer("reject")}
          disabled={pending}
          className="rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-background disabled:opacity-50"
        >
          {pending && answer === "reject" ? t.sending : t.reject}
        </button>
      </div>
      <p className="text-xs text-muted">{t.acceptHelp}</p>
    </form>
  );
}
