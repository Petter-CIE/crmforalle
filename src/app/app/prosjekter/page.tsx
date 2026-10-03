import type { Metadata } from "next";
import { ProjectDot } from "@/components/crm/project-dot";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { createProject } from "@/app/app/crm-actions";
import { listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { ProjectFields } from "./project-fields";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.projects.title };
}

export default async function ProjectsPage({ searchParams }: PageProps<"/app/prosjekter">) {
  const { arkiv, mine } = await searchParams;
  const showArchived = arkiv === "1";
  const onlyMine = mine === "1";
  const ctx = await requireWorkspace();
  const { supabase, user, workspace } = ctx;
  const { t } = await getI18n();
  let q = supabase
    .from("projects")
    .select("id, name, description, color, archived, owner_id, project_contacts(count), deals(count), tasks(count)")
    .eq("workspace_id", workspace.id)
    .eq("archived", showArchived)
    .is("tasks.done_at", null)
    .order("name");
  if (onlyMine) q = q.eq("owner_id", user.id);
  const [{ data: projects }, members] = await Promise.all([q, listMembers(ctx)]);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const qs = (m: boolean, a: boolean) => {
    const p = new URLSearchParams();
    if (m) p.set("mine", "1");
    if (a) p.set("arkiv", "1");
    const s = p.toString();
    return `/app/prosjekter${s ? `?${s}` : ""}`;
  };
  const tabs = [
    { on: !onlyMine, label: t.projects.all, href: qs(false, showArchived) },
    { on: onlyMine, label: t.projects.mine, href: qs(true, showArchived) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.projects.title}
        actions={
          <Link href={qs(onlyMine, !showArchived)} className="text-sm text-muted hover:underline">
            {showArchived ? t.crm.back : t.projects.showArchived}
          </Link>
        }
      />
      {members.length > 1 && (
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.on ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab.on ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background"}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
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
                      <ProjectDot color={p.color} className="h-3 w-3" />
                      <h2 className="font-semibold">{p.name}</h2>
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <p className="mt-2 text-xs text-muted">
                      {t.projects.count(p.project_contacts?.[0]?.count ?? 0)} · {p.deals?.[0]?.count ?? 0} {t.deals.title.toLowerCase()} ·{" "}
                      {t.projects.openTasks(p.tasks?.[0]?.count ?? 0)}
                    </p>
                    {members.length > 1 && p.owner_id && (
                      <p className="mt-1 text-xs text-muted">
                        {t.projects.owner}: <span className="text-foreground">{nameOf.get(p.owner_id) ?? "?"}</span>
                      </p>
                    )}
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
              <ProjectFields t={t} members={members} me={user.id} />
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}
