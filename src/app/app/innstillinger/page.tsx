import type { Metadata } from "next";
import { Button, Card, Select } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { changeRole, removeMember, revokeInvitation } from "./actions";
import { InviteForm, WorkspaceForm, type SettingsTexts } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
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
  };

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("members")
      .select("user_id, role, created_at, profiles(full_name, email)")
      .eq("workspace_id", workspace.id)
      .order("created_at"),
    manager
      ? supabase
          .from("invitations")
          .select("id, email, role, expires_at")
          .eq("workspace_id", workspace.id)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: "admin" | "user" | "owner"; expires_at: string }[] }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>

      <Card>
        <h2 className="mb-4 font-semibold">{s.company}</h2>
        {manager ? (
          <WorkspaceForm name={workspace.name} orgNumber={workspace.org_number ?? ""} t={formTexts} />
        ) : (
          <p className="text-sm">
            {workspace.name}
            {workspace.org_number ? ` · ${s.orgNr} ${workspace.org_number}` : ""}
          </p>
        )}
        <p className="mt-4 text-sm text-muted">
          {s.subscription}: <strong className="text-foreground">{t.common.plans[workspace.plan]}</strong>. {s.unlimitedUsers}
        </p>
      </Card>

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
              </li>
            );
          })}
        </ul>

        {manager && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">{s.inviteTitle}</h3>
            <InviteForm t={formTexts} />
            {invitations && invitations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{s.pending}</h4>
                <ul className="divide-y divide-border">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="flex-1 truncate">{inv.email}</span>
                      <span className="text-xs text-muted">{roles[inv.role]}</span>
                      <span className="text-xs text-muted">
                        {s.expires} {new Date(inv.expires_at).toLocaleDateString(dateLocale)}
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
