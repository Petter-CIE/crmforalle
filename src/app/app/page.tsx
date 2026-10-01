import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.today.title };
}

export default async function TodayPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const [{ data: profile }, { count: memberCount }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
  ]);
  const firstName = profile?.full_name?.split(" ")[0];

  const steps = [
    { done: true, label: t.today.stepCreate, href: null },
    {
      done: (memberCount ?? 0) > 1,
      label: t.today.stepInvite,
      href: canManage(workspace.role) ? "/app/innstillinger#brukere" : null,
    },
    { done: false, label: t.today.stepCustomers, href: null },
    { done: false, label: t.today.stepPipeline, href: null },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.today.hello(firstName)}</h1>
        <p className="text-sm text-muted">{t.today.intro}</p>
      </header>

      <Card>
        <h2 className="mb-4 font-semibold">{t.today.getStarted}</h2>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                  s.done ? "border-brand bg-brand text-white" : "border-border text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
              {!s.done && s.href && (
                <ButtonLink href={s.href} variant="secondary" className="ml-auto !px-3 !py-1 text-xs">
                  {t.today.doItNow}
                </ButtonLink>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [t.today.myTasks, "0"],
          [t.today.openDeals, `0 ${t.today.currency}`],
          [t.today.stale, "0"],
        ].map(([label, value]) => (
          <Card key={label} className="!p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
