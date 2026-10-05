import type { Metadata } from "next";
import { Button, Card, Select } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { changeRole, removeMember, revokeInvitation, setMemberProjects } from "@/app/app/innstillinger/actions";
import { InviteForm, ProjectAccessFields, type SettingsTexts } from "@/app/app/innstillinger/forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.team };
}

/** Colleagues in the company: roles, project access and invitations. */
export default async function TeamPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const manager = canManage(workspace.role);
  const s = t.settings;
  const roles = t.common.roles;

  const formTexts: SettingsTexts = {
    companyName: t.onboarding.companyName,
    orgNr: s.orgNr,
    save: t.common.save,
    saving: t.common.saving,
    email: s.email,
    invitePlaceholder: s.invitePlaceholder,
    role: s.role,
    roleUser: roles.user,
    roleAdmin: roles.admin,
    invite: s.invite,
    inviting: s.inviting,
    copy: s.copy,
    copied: s.copied,
    inviteLink: s.inviteLink,
    accessTitle: s.accessTitle,
    accessHelp: s.accessHelp,
    noProjects: s.noProjects,
  };

  const [{ data: members }, { data: invitations }, { data: projectRows }, { data: projectMembers }] = await Promise.all([
    supabase
      .from("members")
      .select("user_id, role, restricted, created_at, profiles(full_name, email)")
      .eq("workspace_id", workspace.id)
      .order("created_at"),
    manager
      ? supabase
          .from("invitations")
          .select("id, email, role, expires_at, project_ids")
          .eq("workspace_id", workspace.id)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as { id: string; email: string; role: "admin" | "user" | "owner"; expires_at: string; project_ids: string[] }[],
        }),
    manager
      ? supabase.from("projects").select("id, name, archived").eq("workspace_id", workspace.id).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string; archived: boolean }[] }),
    manager
      ? supabase.from("project_members").select("user_id, project_id").eq("workspace_id", workspace.id)
      : Promise.resolve({ data: [] as { user_id: string; project_id: string }[] }),
  ]);
  const allProjects = projectRows ?? [];
  const activeProjects = allProjects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }));
  const projectName = new Map(allProjects.map((p) => [p.id, p.name]));
  const projectsOf = new Map<string, string[]>();
  for (const pm of projectMembers ?? []) projectsOf.set(pm.user_id, [...(projectsOf.get(pm.user_id) ?? []), pm.project_id]);
  const accessLabel = (ids: string[]) => {
    const names = ids.map((id) => projectName.get(id)).filter(Boolean);
    return names.length > 0 ? s.accessOnly(names.join(", ")) : s.accessNone;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.team} />
      <Card>
        <h2 id="brukere" className="mb-1 font-semibold">
          {s.users}
        </h2>
        <p className="mb-4 text-sm text-muted">{s.usersIntro}</p>

        <ul className="divide-y divide-border">
          {(members ?? []).map((m) => {
            const isMe = m.user_id === user.id;
            const editable = manager && !isMe && m.role !== "owner";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.profiles?.full_name || m.profiles?.email}
                    {isMe && <span className="ml-2 text-xs text-muted">({t.common.you})</span>}
                  </p>
                  {m.profiles?.full_name && <p className="truncate text-xs text-muted">{m.profiles.email}</p>}
                  {manager && (
                    <p className="truncate text-xs text-muted">
                      {s.access}:{" "}
                      <span className="text-foreground">
                        {m.role === "user" && m.restricted ? accessLabel(projectsOf.get(m.user_id) ?? []) : s.accessAll}
                      </span>
                    </p>
                  )}
                </div>
                {editable ? (
                  <>
                    <form action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Select name="role" defaultValue={m.role} aria-label={s.role}>
                        <option value="user">{roles.user}</option>
                        <option value="admin">{roles.admin}</option>
                      </Select>
                      <Button type="submit" variant="ghost" className="!px-2 text-xs">
                        {s.change}
                      </Button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Button type="submit" variant="danger" className="!px-2 text-xs">
                        {s.remove}
                      </Button>
                    </form>
                  </>
                ) : (
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">{roles[m.role]}</span>
                )}
                {editable && (
                  <details className="w-full">
                    <summary className="cursor-pointer text-xs text-brand hover:underline">{s.accessEdit}</summary>
                    {m.role === "user" ? (
                      <form action={setMemberProjects} className="mt-3 space-y-3 rounded-lg border border-border p-3">
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <ProjectAccessFields
                          projects={activeProjects}
                          selected={m.restricted ? (projectsOf.get(m.user_id) ?? []) : []}
                          t={formTexts}
                        />
                        <Button type="submit" variant="secondary" className="text-xs">
                          {s.accessSave}
                        </Button>
                      </form>
                    ) : (
                      <p className="mt-2 text-xs text-muted">{s.accessAdminNote}</p>
                    )}
                  </details>
                )}
              </li>
            );
          })}
        </ul>

        {manager && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">{s.inviteTitle}</h3>
            <InviteForm t={formTexts} projects={activeProjects} />
            {invitations && invitations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{s.pending}</h4>
                <ul className="divide-y divide-border">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="flex-1 truncate">{inv.email}</span>
                      <span className="text-xs text-muted">{roles[inv.role]}</span>
                      {inv.role === "user" && inv.project_ids.length > 0 && (
                        <span className="max-w-[12rem] truncate text-xs text-muted">{accessLabel(inv.project_ids)}</span>
                      )}
                      <span className="text-xs text-muted">
                        {s.expires} {new Date(inv.expires_at).toLocaleDateString(dateLocale, { timeZone: "Europe/Oslo" })}
                      </span>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <Button type="submit" variant="danger" className="!px-2 text-xs">
                          {s.revoke}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
