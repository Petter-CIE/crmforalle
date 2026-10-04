"use client";

import { useEffect, useRef, useState } from "react";

type Texts = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  send: string;
  sending: string;
  thanks: string;
  errInvalid: string;
  errRate: string;
  errGeneric: string;
  privacy: string;
  poweredBy: string;
};

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#1f6f54] focus:ring-2 focus:ring-[#1f6f54]/20";

/** The visitor's form. Sends with fetch; without JavaScript it is a normal form post. */
export function LeadForm({
  formKey,
  embed,
  initialSent,
  initialError,
  config,
  t,
}: {
  formKey: string;
  embed: boolean;
  initialSent: boolean;
  initialError: string | null;
  config: { askPhone: boolean; askCompany: boolean; requireMessage: boolean };
  t: Texts;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent">(initialSent ? "sent" : "idle");
  const [error, setError] = useState<string | null>(initialError);
  const started = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // Remember when the form was shown (forms sent within 2.5 s are treated as spam).
  useEffect(() => {
    if (started.current) started.current.value = String(Date.now());
  }, []);

  // In an iframe: tell the page how tall we are so it can size the frame.
  useEffect(() => {
    if (!embed || !root.current || window.parent === window) return;
    const post = () => window.parent.postMessage({ allseatsForm: formKey, height: Math.ceil(document.documentElement.scrollHeight) }, "*");
    const ro = new ResizeObserver(post);
    ro.observe(root.current);
    post();
    return () => ro.disconnect();
  }, [embed, formKey, state, error]);

  const message = (code: string | null) => (code === "invalid" ? t.errInvalid : code === "rate_limited" ? t.errRate : code ? t.errGeneric : null);

  if (state === "sent") {
    return (
      <div ref={root} role="status" className="rounded-xl bg-[#e6f2ec] p-5 text-sm text-[#185a44]">
        <p className="whitespace-pre-line font-medium">✓ {t.thanks}</p>
      </div>
    );
  }

  return (
    <div ref={root}>
      <form
        action={`/api/lead/${formKey}`}
        method="post"
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries());
          if (!String(data.email ?? "").trim() && !String(data.phone ?? "").trim()) {
            setError("invalid");
            return;
          }
          setState("sending");
          setError(null);
          try {
            const res = await fetch(`/api/lead/${formKey}`, {
              method: "POST",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: JSON.stringify(data),
            });
            const json = (await res.json()) as { ok: boolean; error?: string };
            if (json.ok) setState("sent");
            else {
              setState("idle");
              setError(json.error ?? "failed");
            }
          } catch {
            setState("idle");
            setError("failed");
          }
        }}
      >
        <input ref={started} type="hidden" name="_t" defaultValue="" />
        {/* Hidden from people; bots tend to fill it in. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">{t.name} *</span>
          <input name="name" required maxLength={120} autoComplete="name" className={field} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">{t.email}</span>
            <input name="email" type="email" maxLength={200} autoComplete="email" className={field} />
          </label>
          {config.askPhone && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">{t.phone}</span>
              <input name="phone" type="tel" maxLength={50} autoComplete="tel" className={field} />
            </label>
          )}
        </div>
        {config.askCompany && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">{t.company}</span>
            <input name="company" maxLength={200} autoComplete="organization" className={field} />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            {t.message}
            {config.requireMessage ? " *" : ""}
          </span>
          <textarea name="message" rows={4} maxLength={5000} required={config.requireMessage} className={field} />
        </label>
        {message(error) && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message(error)}
          </p>
        )}
        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-lg bg-[#1f6f54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185a44] disabled:opacity-60 sm:w-auto"
        >
          {state === "sending" ? t.sending : t.send}
        </button>
        <p className="text-xs text-zinc-500">
          {t.privacy}
          {!embed && (
            <>
              {" · "}
              <a href="https://allseats.no" target="_blank" rel="noopener" className="hover:underline">
                {t.poweredBy}
              </a>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
