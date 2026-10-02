"use client";

import { useState } from "react";

/** Copies a value to the clipboard and confirms briefly. */
export function CopyButton({ value, label, copied }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* clipboard blocked: the address is still visible to select */
        }
      }}
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-background"
    >
      {done ? copied : label}
    </button>
  );
}
