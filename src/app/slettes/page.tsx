import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button, Card, Logo, Notice, Select } from "@/components/ui";
import { switchWorkspace } from "@/app/app/actions";
import { cancelCompanyDeletion } from "@/app/app/innstillinger/deletion-actions";
import { formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { listWorkspaces, requireUser, WORKSPACE_COOKIE } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.deletion.pendingTitle };
}

/** Shown while a company waits to be deleted: the owner can export data or undo, others can switch company. */
export default async function PendingDeletionPage({ searchParams }: PageProps<"/slettes">) {
  const sp = await searchParams;
  const ctx = await requireUser();
  const workspaces = await listWorkspaces(ctx);
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const current = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  if (!current?.deletion_requested_at) redirect("/app");
  const others = workspaces.filter((w) => w.id !== current.id && !w.suspended_at && !w.deletion_requested_at);
  const { t, dateLocale } = await getI18n();
  const d = t.deletion;
  const owner = current.role === "owner";
  const when = current.deletion_scheduled_for ? formatDate(current.deletion_scheduled_for, dateLocale) : "";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-2 text-lg font-semibold">{d.pendingTitle}</h1>
          <p className="text-sm text-muted">{d.pendingText(current.name, when)}</p>
          {sp.feil && (
            <div className="mt-4">
              <Notice tone="error">{d.failed}</Notice>
            </div>
          )}
          {owner ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">{d.exportTitle}</p>
                <div className="flex flex-wrap gap-2">
                  <a href="/app/eksport?type=kontakter" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background">
                    ⬇ {t.exportData.contacts}
                  </a>
                  <a href="/app/eksport?type=bedrifter" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background">
                    ⬇ {t.exportData.companies}
                  </a>
                </div>
              </div>
              <form action={cancelCompanyDeletion}>
                <Button type="submit">{d.undo}</Button>
              </form>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{d.pendingOthers}</p>
          )}
          {others.length > 0 && (
            <form action={switchWorkspace} className="mt-5 space-y-2">
              <label htmlFor="workspace_id" className="text-sm font-medium">
                {t.suspended.other}
              </label>
              <div className="flex gap-2">
                <Select id="workspace_id" name="workspace_id" className="min-w-0 flex-1">
                  {others.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary">
                  {t.nav.switch}
                </Button>
              </div>
            </form>
          )}
          <form action="/auth/logg-ut" method="post" className="mt-5">
            <button type="submit" className="text-sm text-muted hover:underline">
              {t.common.logout}
            </button>
          </form>
        </Card>
      </div>
    </main>
  );
}
