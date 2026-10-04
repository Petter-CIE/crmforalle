import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { EmptyHero, PageHeader } from "@/components/ui-extra";
import { companyDuplicates, contactDuplicates } from "@/lib/duplicates";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dupes.title };
}

export default async function DuplicatesPage({ searchParams }: PageProps<"/app/duplikater">) {
  const { type } = await searchParams;
  const kind = type === "kontakter" ? "contact" : "company";
  const ctx = await requireWorkspace();
  const { t } = await getI18n();
  const d = t.dupes;
  const list = kind === "company" ? await companyDuplicates(ctx) : await contactDuplicates(ctx);
  const manager = canManage(ctx.workspace.role);
  const base = kind === "company" ? "/app/bedrifter" : "/app/kontakter";

  return (
    <div className="space-y-6">
      <PageHeader title={d.title} subtitle={d.intro} />
      <nav className="flex gap-1" aria-label={d.title}>
        {(
          [
            ["company", d.companies, "/app/duplikater"],
            ["contact", d.contacts, "/app/duplikater?type=kontakter"],
          ] as const
        ).map(([k, label, href]) => (
          <Link
            key={k}
            href={href}
            aria-current={kind === k ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyHero icon={kind === "company" ? "companies" : "contacts"} title={d.none} />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-border">
            {list.map((p) => (
              <li key={`${p.a.id}${p.b.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                  {[p.a, p.b].map((x) => (
                    <div key={x.id} className="min-w-0">
                      <Link href={`${base}/${x.id}`} className="font-medium hover:text-brand">
                        {x.label}
                      </Link>
                      {x.hint && <p className="truncate text-xs text-muted">{x.hint}</p>}
                    </div>
                  ))}
                </div>
                <span className="flex flex-wrap gap-1">
                  {p.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      {d.reasons[r]}
                    </span>
                  ))}
                </span>
                {manager && (
                  <Link
                    href={`/app/duplikater/sla-sammen?type=${kind}&a=${p.a.id}&b=${p.b.id}`}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
                  >
                    {d.merge} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
