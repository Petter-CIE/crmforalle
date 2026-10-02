"use client";

import { useState } from "react";
import { Input } from "@/components/ui";

function addDays(iso: string, days: number) {
  const base = new Date(`${iso}T12:00:00Z`);
  const today = new Date();
  // extend from today if the trial has already ended
  const from = base.getTime() < today.getTime() ? today : base;
  return new Date(from.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function TrialInput({ initial, labels }: { initial: string; labels: { d7: string; d14: string; d30: string } }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <Input id="a_trial" name="trial_ends" type="date" required value={value} onChange={(e) => setValue(e.target.value)} className="w-full" />
      <div className="flex gap-2">
        {([7, 14, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setValue((v) => addDays(v || initial, d))}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-brand hover:text-brand"
          >
            {d === 7 ? labels.d7 : d === 14 ? labels.d14 : labels.d30}
          </button>
        ))}
      </div>
    </div>
  );
}
