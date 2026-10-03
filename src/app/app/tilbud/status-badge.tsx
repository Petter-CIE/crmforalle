import type { QuoteStatus } from "@/lib/quotes";

const STYLE: Record<QuoteStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-100 text-sky-800",
  accepted: "bg-brand-soft text-brand",
  rejected: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, label }: { status: QuoteStatus; label: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>{label}</span>;
}
