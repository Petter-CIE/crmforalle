"use client";

import { useState, useTransition } from "react";
import { cancelBooking } from "../../actions";

export function CancelButton({ token, slug, t }: { token: string; slug: string | null; t: { confirm: string; done: string; failed: string; rebook: string } }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const [busy, start] = useTransition();
  if (state === "done") {
    return (
      <div className="space-y-3" role="status">
        <p className="font-medium text-brand">✓ {t.done}</p>
        {slug && (
          <a href={`/booking/${slug}`} className="inline-block text-sm text-brand underline">
            {t.rebook} →
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => setState((await cancelBooking(token)).ok ? "done" : "failed"))}
        className="rounded-lg bg-danger px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {t.confirm}
      </button>
      {state === "failed" && <p className="text-sm text-danger">{t.failed}</p>}
    </div>
  );
}
