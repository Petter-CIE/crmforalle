"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { useToast, type DeleteKind } from "@/components/toast";

/**
 * Delete with "Undo": the item disappears at once and is really deleted after a few seconds.
 * Rows that show the item carry data-del={id} so they hide immediately.
 */
export function DeleteButton({
  kind,
  id,
  message,
  redirectTo,
  children,
  variant = "danger",
  className = "",
  ariaLabel,
}: {
  kind: DeleteKind;
  id: string;
  message: string;
  redirectTo?: string;
  children: ReactNode;
  variant?: "danger" | "ghost" | "secondary";
  className?: string;
  ariaLabel?: string;
}) {
  const api = useToast();
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      aria-label={ariaLabel}
      onClick={() => api?.scheduleDelete({ kind, id, message, redirectTo })}
    >
      {children}
    </Button>
  );
}
