import type { Metadata } from "next";
import { ButtonLink, Select } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { contactName, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { Board, type BoardDeal } from "./board";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.deals.title };
}

export default async function SalesPage({ searchParams }: PageProps<"/app/salg">) {
  const { prosjekt } = await searchParams;
  const projectId = typeof prosjekt === "string" ? prosjekt : "";
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();

  let dealsReq = supabase
    .from("deals")
    .select("id, title, value, stage_id, position, expected_close, companies(name), contacts(first_name, last_name), projects(name, color)")
    .eq("workspace_id", workspace.id)
    .limit(1000);
  if (projectId) dealsReq = dealsReq.eq("project_id", projectId);
  const [{ data: stages }, { data: deals }, { data: projects }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name, is_won, is_lost").eq("workspace_id", workspace.id).order("position"),
    dealsReq,
    supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
  ]);

  const openStageIds = new Set((stages ?? []).filter((s) => !s.is_won && !s.is_lost).map((s) => s.id));
  const openTotal = (deals ?? []).filter((d) => openStageIds.has(d.stage_id)).reduce((s, d) => s + Number(d.value), 0);
  const boardDeals: BoardDeal[] = (deals ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    value: Number(d.value),
    stage_id: d.stage_id,
    position: d.position,
    company: d.companies?.name ?? null,
    contact: d.contacts ? contactName(d.contacts) : null,
    projectColor: d.projects?.color ?? null,
    projectName: d.projects?.name ?? null,
    expectedClose: d.expected_close,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.deals.title}
        subtitle={
          <>
            {t.deals.total}: <strong className="text-foreground">{formatMoney(openTotal, dateLocale)}</strong> · {t.deals.dragHint}
          </>
        }
        actions={
          <>
            {(projects ?? []).length > 0 && (
              <form>
                <Select name="prosjekt" defaultValue={projectId} aria-label={t.deals.project} className="max-w-48">
                  <option value="">{t.contacts.allProjects}</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <button type="submit" className="ml-1 text-sm text-brand hover:underline">
                  {t.contacts.filter}
                </button>
              </form>
            )}
            <ButtonLink href={projectId ? `/app/salg/ny?prosjekt=${projectId}` : "/app/salg/ny"}>+ {t.deals.new}</ButtonLink>
          </>
        }
      />
      <Board stages={stages ?? []} deals={boardDeals} dateLocale={dateLocale} emptyText="—" />
    </div>
  );
}
