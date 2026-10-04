"use client";

import { useState, useTransition } from "react";
import { getCalendarLink } from "./actions";

type Texts = {
  create: string;
  copy: string;
  copied: string;
  rotate: string;
  rotateConfirm: string;
  secret: string;
  google: string;
  outlook: string;
  apple: string;
  open: string;
};

/** Creates/shows the personal calendar subscription link. */
export function CalendarLink({ t }: { t: Texts }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();
  const load = (rotate: boolean) => start(async () => setUrl(await getCalendarLink(rotate)));
  const btn = "rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-background disabled:opacity-50";

  if (!url) {
    return (
      <button type="button" disabled={busy} onClick={() => load(false)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
        📅 {t.create}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={t.copy} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // clipboard blocked – the link can still be selected
            }
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
        <a href={url.replace(/^https?:/, "webcal:")} className={btn}>
          {t.open}
        </a>
        <button type="button" disabled={busy} className={`${btn} text-danger`} onClick={() => window.confirm(t.rotateConfirm) && load(true)}>
          {t.rotate}
        </button>
      </div>
      <p className="text-xs text-amber-700">🔒 {t.secret}</p>
      <ul className="space-y-1 text-xs text-muted">
        <li>• {t.google}</li>
        <li>• {t.outlook}</li>
        <li>• {t.apple}</li>
      </ul>
    </div>
  );
}
