import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Input } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.companies.title };
}

export default async function CompaniesPage({ searchParams }: PageProps<"/app/bedrifter">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();

  let req = supabase
    .from("companies")
    .select("id, name, org_number, city, contacts(count), deals(count)")
    .eq("workspace_id", workspace.id)
    .order("name")
    .limit(500);
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    req = req.or(`name.ilike.%${safe}%,org_number.ilike.%${safe.replace(/\s/g, "")}%,city.ilike.%${safe}%`);
  }
  const { data: companies } = await req;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.companies.title}
        actions={<ButtonLink href="/app/bedrifter/ny">+ {t.companies.new}</ButtonLink>}
      />
      <form className="flex gap-2">
        <Input name="q" defaultValue={query} placeholder={t.companies.searchPlaceholder} aria-label={t.crm.search} />
      </form>
      {!companies || companies.length === 0 ? (
        <EmptyState>{query ? t.crm.noResults : t.companies.empty}</EmptyState>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.companies.name}</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">{t.companies.orgNumber}</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">{t.companies.city}</th>
                <th className="px-4 py-2 text-right font-medium">{t.companies.contacts}</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">{t.companies.deals}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-background">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/bedrifter/${c.id}`} className="font-medium hover:text-brand">
                      {c.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2.5 tabular-nums text-muted sm:table-cell">{c.org_number}</td>
                  <td className="hidden px-4 py-2.5 text-muted md:table-cell">{c.city}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.contacts?.[0]?.count ?? 0}</td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums sm:table-cell">{c.deals?.[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
