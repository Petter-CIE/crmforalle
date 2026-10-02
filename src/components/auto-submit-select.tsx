"use client";

import type { ComponentProps } from "react";

/** A <select> that submits its parent form as soon as the value changes. */
export function AutoSubmitSelect({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`rounded-md border border-transparent bg-transparent py-0.5 text-xs text-muted hover:border-border focus:border-border focus:outline-none ${className}`}
    />
  );
}
