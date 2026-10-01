import type { Metadata } from "next";
import { Button, Card, Select } from "@/components/ui";
import { canManage, requireWorkspace, ROLE_LABEL } from "@/lib/session";
import { changeRole, removeMember, revokeInvitation } from "./actions";
import { InviteForm, WorkspaceForm } from "./forms";

export const metadata: Metadata = { title: "Innstillinger" };

const PLAN_LABEL = { trial: "Prøveperiode", start: "Start", bedrift: "Bedrift" } as const;

export default async function SettingsPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const manager = canManage(workspace.role);

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
      <h1 className="text-2xl font-semibold tracking-tight">Innstillinger</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Bedriften</h2>
        {manager ? (
          <WorkspaceForm name={workspace.name} orgNumber={workspace.org_number ?? ""} />
        ) : (
          <p className="text-sm">
            {workspace.name}
            {workspace.org_number ? ` · org.nr. ${workspace.org_number}` : ""}
          </p>
        )}
        <p className="mt-4 text-sm text-muted">
          Abonnement: <strong className="text-foreground">{PLAN_LABEL[workspace.plan]}</strong>. Ubegrenset antall brukere.
        </p>
      </Card>

      <Card>
        <h2 id="brukere" className="mb-1 font-semibold">
          Brukere
        </h2>
        <p className="mb-4 text-sm text-muted">Alle i bedriften kan bruke CRM-et. Det koster ingenting ekstra.</p>

        <ul className="divide-y divide-border">
          {(members ?? []).map((m) => {
            const isMe = m.user_id === user.id;
            const editable = manager && !isMe && m.role !== "owner";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.profiles?.full_name || m.profiles?.email}
                    {isMe && <span className="ml-2 text-xs text-muted">(deg)</span>}
                  </p>
                  {m.profiles?.full_name && <p className="truncate text-xs text-muted">{m.profiles.email}</p>}
                </div>
                {editable ? (
                  <>
                    <form action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Select name="role" defaultValue={m.role} aria-label="Rolle">
                        <option value="user">Bruker</option>
                        <option value="admin">Administrator</option>
                      </Select>
                      <Button type="submit" variant="ghost" className="!px-2 text-xs">
                        Endre
                      </Button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Button type="submit" variant="danger" className="!px-2 text-xs">
                        Fjern
                      </Button>
                    </form>
                  </>
                ) : (
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                )}
              </li>
            );
          })}
        </ul>

        {manager && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Inviter en kollega</h3>
            <InviteForm />
            {invitations && invitations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Ventende invitasjoner</h4>
                <ul className="divide-y divide-border">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="flex-1 truncate">{inv.email}</span>
                      <span className="text-xs text-muted">{ROLE_LABEL[inv.role]}</span>
                      <span className="text-xs text-muted">
                        utløper {new Date(inv.expires_at).toLocaleDateString("nb-NO")}
                      </span>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <Button type="submit" variant="danger" className="!px-2 text-xs">
                          Trekk tilbake
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
