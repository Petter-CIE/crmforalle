"use client";

import { useState } from "react";

export function CopyLink({ url, active, t }: { url: string; active: boolean; t: { copy: string; copied: string; open: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`space-y-2 ${active ? "" : "opacity-60"}`}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={t.copy} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm" />
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
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
          {copied ? `✓ ${t.copied}` : t.copy}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background">
          {t.open} ↗
        </a>
      </div>
    </div>
  );
}
