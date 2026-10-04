"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** "Give feedback" in the sidebar; remembers which page the user was on. */
export function FeedbackLink({ label }: { label: string }) {
  const pathname = usePathname();
  const from = pathname.startsWith("/app") && pathname !== "/app/tilbakemelding" ? pathname : "";
  return (
    <Link
      href={from ? `/app/tilbakemelding?fra=${encodeURIComponent(from)}` : "/app/tilbakemelding"}
      className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-brand/40 px-3 py-2 text-sm text-brand hover:bg-brand-soft"
    >
      <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </Link>
  );
}
