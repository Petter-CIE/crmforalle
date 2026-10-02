import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Input, Select } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { contactName, PROJECT_COLORS, type ProjectColor } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.contacts.title };
}

export default async function ContactsPage({ searchParams }: PageProps<"/app/kontakter">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const projectId = typeof sp.prosjekt === "string" ? sp.prosjekt : "";
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, color")
    .eq("workspace_id", workspace.id)
    .eq("archived", false)
    .order("name");

  const join = projectId ? "project_contacts!inner(project_id)" : "project_contacts(project_id)";
  let req = supabase
    .from("contacts")
    .select(`id, first_name, last_name, email, phone, title, companies(id, name), ${join}`)
    .eq("workspace_id", workspace.id)
    .order("first_name")
    .limit(500);
  if (projectId) req = req.eq("project_contacts.project_id", projectId);
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    req = req.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data: contacts } = await req;
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.contacts.title}
        actions={
          <ButtonLink href={projectId ? `/app/kontakter/ny?prosjekt=${projectId}` : "/app/kontakter/ny"}>
            + {t.contacts.new}
          </ButtonLink>
        }
      />
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={query} placeholder={t.contacts.searchPlaceholder} aria-label={t.crm.search} />
        <Select name="prosjekt" defaultValue={projectId} aria-label={t.contacts.projects}>
          <option value="">{t.contacts.allProjects}</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <button type="submit" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:bg-background">
          {t.contacts.filter}
        </button>
      </form>
      {!contacts || contacts.length === 0 ? (
        <EmptyState>{query || projectId ? t.crm.noResults : t.contacts.empty}</EmptyState>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-border">
            {contacts.map((k) => (
              <li key={k.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-background">
                <div className="min-w-0 flex-1">
                  <Link href={`/app/kontakter/${k.id}`} className="row-link font-medium hover:text-brand">
                    {contactName(k)}
                  </Link>
                  <p className="text-xs text-muted">
                    {[k.title, k.companies?.name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(k.project_contacts ?? []).map((pc) => {
                    const p = projectById.get(pc.project_id);
                    if (!p) return null;
                    return (
                      <Link
                        key={pc.project_id}
                        href={`/app/kontakter?prosjekt=${p.id}`}
                        className="row-above inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs hover:underline"
                      >
                        <span className={`h-2 w-2 rounded-full ${PROJECT_COLORS[p.color as ProjectColor] ?? "bg-zinc-400"}`} />
                        {p.name}
                      </Link>
                    );
                  })}
                </div>
                <div className="hidden w-56 text-right text-xs text-muted md:block">
                  <div>{k.phone}</div>
                  <div className="truncate">{k.email}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
