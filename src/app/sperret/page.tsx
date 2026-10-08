import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button, Card, Logo, Select } from "@/components/ui";
import { switchWorkspace } from "@/app/app/actions";
import { getI18n } from "@/lib/i18n/server";
import { listWorkspaces, requireUser, WORKSPACE_COOKIE } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.suspended.title };
}

export default async function SuspendedPage() {
  const ctx = await requireUser();
  const workspaces = await listWorkspaces(ctx);
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const current = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  if (current?.deletion_requested_at) redirect("/slettes");
  if (!current || !current.suspended_at) redirect("/app");
  const others = workspaces.filter((w) => w.id !== current.id && !w.suspended_at);
  const { t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-2 text-lg font-semibold">{t.suspended.title}</h1>
          <p className="text-sm text-muted">{t.suspended.text(current.name)}</p>
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
