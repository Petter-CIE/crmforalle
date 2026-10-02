import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { createProject } from "@/app/app/crm-actions";
import { PROJECT_COLORS, type ProjectColor } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { ProjectFields } from "./project-fields";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.projects.title };
}

export default async function ProjectsPage({ searchParams }: PageProps<"/app/prosjekter">) {
  const { arkiv } = await searchParams;
  const showArchived = arkiv === "1";
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, color, archived, project_contacts(count), deals(count)")
    .eq("workspace_id", workspace.id)
    .eq("archived", showArchived)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.projects.title}
        actions={
          <Link href={showArchived ? "/app/prosjekter" : "/app/prosjekter?arkiv=1"} className="text-sm text-muted hover:underline">
            {showArchived ? t.crm.back : t.projects.showArchived}
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {!projects || projects.length === 0 ? (
            <EmptyState>{t.projects.empty}</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/app/prosjekter/${p.id}`} className="block">
                  <Card className="!p-4 transition-colors hover:border-brand">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${PROJECT_COLORS[p.color as ProjectColor] ?? "bg-zinc-400"}`} />
                      <h2 className="font-semibold">{p.name}</h2>
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <p className="mt-2 text-xs text-muted">
                      {t.projects.count(p.project_contacts?.[0]?.count ?? 0)} · {p.deals?.[0]?.count ?? 0} {t.deals.title.toLowerCase()}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        {!showArchived && (
          <Card>
            <h2 className="mb-3 font-semibold">{t.projects.new}</h2>
            <ActionForm action={createProject} submitLabel={t.projects.new} pendingLabel={t.crm.saving}>
              <ProjectFields t={t} />
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}
