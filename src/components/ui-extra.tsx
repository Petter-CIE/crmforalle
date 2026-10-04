import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 ${className}`}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  backLabel,
  leading,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="space-y-2">
      {backHref && (
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function Field({ label, htmlFor, children, className = "" }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-xs ${className}`}>{children}</span>;
}

const ILLUSTRATIONS = {
  companies: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4",
  contacts: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  deals: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  projects: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  quotes: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  products: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  tasks: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
} as const;

/** Friendly empty state with an icon, one sentence and the next step. */
export function EmptyHero({
  icon,
  title,
  text,
  actions,
}: {
  icon: keyof typeof ILLUSTRATIONS;
  title: string;
  text?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fade-up flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="relative mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
        <span aria-hidden className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-brand/20" />
        <span aria-hidden className="absolute -bottom-1 -left-2 h-2.5 w-2.5 rounded-full bg-brand/30" />
        <svg aria-hidden viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={ILLUSTRATIONS[icon]} />
        </svg>
      </span>
      <h2 className="font-semibold">{title}</h2>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
