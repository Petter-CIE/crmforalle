"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";
import type { FormResult } from "@/app/app/crm-actions";

/**
 * Form bound to a server action returning {error?, ok?}. Shows errors, pending state
 * and an optional success text; can reset its inputs after success (e.g. note/task forms).
 */
export function ActionForm({
  action: serverAction,
  children,
  submitLabel,
  pendingLabel,
  successText,
  resetOnSuccess = false,
  className = "space-y-4",
  submitClassName = "",
  footer,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  successText?: string;
  resetOnSuccess?: boolean;
  className?: string;
  submitClassName?: string;
  footer?: ReactNode;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(serverAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={action} className={className}>
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && (state.message ?? successText) && <Notice tone="success">{state.message ?? successText}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending} className={submitClassName}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
