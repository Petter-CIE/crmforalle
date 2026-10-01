import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { canManage, requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "I dag" };

export default async function TodayPage() {
  const { supabase, user, workspace } = await requireWorkspace();
  const [{ data: profile }, { count: memberCount }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("workspace_id", workspace.id),
  ]);
  const firstName = profile?.full_name?.split(" ")[0];

  const steps = [
    { done: true, label: "Opprett bedriften", href: null },
    {
      done: (memberCount ?? 0) > 1,
      label: "Inviter kollegene dine – gratis, uansett hvor mange",
      href: canManage(workspace.role) ? "/app/innstillinger#brukere" : null,
    },
    { done: false, label: "Legg inn de første kundene (kommer snart)", href: null },
    { done: false, label: "Sett opp salgstrakten (kommer snart)", href: null },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Hei, ${firstName}!` : "Hei!"}
        </h1>
        <p className="text-sm text-muted">Her ser du dagens oppgaver og salg som trenger oppfølging.</p>
      </header>

      <Card>
        <h2 className="mb-4 font-semibold">Kom i gang</h2>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                  s.done ? "border-brand bg-brand text-white" : "border-border text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
              {!s.done && s.href && (
                <ButtonLink href={s.href} variant="secondary" className="ml-auto !px-3 !py-1 text-xs">
                  Gjør det nå
                </ButtonLink>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Mine oppgaver i dag", "0"],
          ["Åpne salg", "0 kr"],
          ["Uten aktivitet i 14 dager", "0"],
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
