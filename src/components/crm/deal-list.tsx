import Link from "next/link";
import { EmptyState, Pill } from "@/components/ui-extra";
import { formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";

export type DealRow = {
  id: string;
  title: string;
  value: number;
  pipeline_stages: { name: string; is_won: boolean; is_lost: boolean } | null;
};

export const DEAL_ROW_SELECT = "id, title, value, pipeline_stages(name, is_won, is_lost)";

export async function DealList({ deals }: { deals: DealRow[] }) {
  const { t, dateLocale } = await getI18n();
  if (deals.length === 0) return <EmptyState>{t.deals.empty}</EmptyState>;
  return (
    <ul className="divide-y divide-border">
      {deals.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
          <Link href={`/app/salg/${d.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-brand">
            {d.title}
          </Link>
          <Pill
            className={d.pipeline_stages?.is_won ? "!bg-brand-soft text-brand" : d.pipeline_stages?.is_lost ? "!bg-red-50 text-danger" : ""}
          >
            {d.pipeline_stages?.name}
          </Pill>
          <span className="w-28 text-right tabular-nums">{formatMoney(d.value, dateLocale)}</span>
        </li>
      ))}
    </ul>
  );
}
