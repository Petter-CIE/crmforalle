import Link from "next/link";
import { Logo, Select } from "@/components/ui";
import { requireWorkspace, trialDaysLeft } from "@/lib/session";
import { switchWorkspace } from "./actions";
import { Nav } from "./_components/nav";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { user, workspace, workspaces } = await requireWorkspace();
  const daysLeft = trialDaysLeft(workspace.trial_ends_at);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-border bg-surface p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:block">
          <Link href="/app">
            <Logo />
          </Link>
        </div>
        {workspaces.length > 1 ? (
          <form action={switchWorkspace} className="mb-4">
            <label htmlFor="workspace_id" className="sr-only">
              Bytt bedrift
            </label>
            <Select id="workspace_id" name="workspace_id" defaultValue={workspace.id} className="w-full">
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <button type="submit" className="mt-1 text-xs text-brand hover:underline">
              Bytt
            </button>
          </form>
        ) : (
          <p className="mb-4 truncate text-sm font-medium" title={workspace.name}>
            {workspace.name}
          </p>
        )}
        <Nav />
        <div className="mt-6 hidden space-y-2 border-t border-border pt-4 text-xs text-muted md:block">
          <p className="truncate" title={user.email}>
            {user.email}
          </p>
          <form action="/auth/logg-ut" method="post">
            <button type="submit" className="hover:text-foreground hover:underline">
              Logg ut
            </button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        {workspace.plan === "trial" && (
          <div className="border-b border-border bg-brand-soft px-6 py-2 text-sm text-brand">
            {daysLeft > 0
              ? `Prøveperiode: ${daysLeft} ${daysLeft === 1 ? "dag" : "dager"} igjen.`
              : "Prøveperioden er over."}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
        <form action="/auth/logg-ut" method="post" className="border-t border-border p-4 text-center md:hidden">
          <button type="submit" className="text-xs text-muted hover:underline">
            Logg ut ({user.email})
          </button>
        </form>
      </div>
    </div>
  );
}
