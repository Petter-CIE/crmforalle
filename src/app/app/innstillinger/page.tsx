import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { canManage, logoUrl, requireWorkspace } from "@/lib/session";
import { hasAccountingAccess } from "@/lib/accounting/access";
import { formatDateTime } from "@/lib/crm";
import { fikenCredentials } from "@/lib/accounting/fiken-sync";
import { fikenCompanies, fikenEnabled } from "@/lib/fiken";
import { AccountingCard } from "./accounting-card";
import { WorkspaceForm, type SettingsTexts } from "./forms";
import { LogoForm } from "./logo-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function SettingsPage({ searchParams }: PageProps<"/app/innstillinger">) {
  const sp = await searchParams;
  const { supabase, workspace } = await requireWorkspace();
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

  const [{ data: billing }, { data: integrations }] = await Promise.all([
    supabase.from("workspaces").select("plan, accounting_addon").eq("id", workspace.id).single(),
    supabase.from("integrations").select("provider, external_company, last_sync_at, last_error").eq("workspace_id", workspace.id),
  ]);
  const conn = (provider: string) => {
    const i = (integrations ?? []).find((r) => r.provider === provider);
    return i
      ? { company: i.external_company || null, lastSync: i.last_sync_at ? formatDateTime(i.last_sync_at, dateLocale) : null, error: i.last_error }
      : null;
  };
  const tripletex = conn("tripletex");
  const fiken = conn("fiken");
  // Fiken connected but no company chosen yet: the owner/admin picks one from their Fiken user.
  let fikenChoices: { slug: string; name: string; hasApi: boolean }[] | null = null;
  if (fiken && manager) {
    try {
      const creds = await fikenCredentials(supabase, workspace.id);
      if (!creds.slug) {
        fikenChoices = (await fikenCompanies(creds.access)).map((c) => ({ slug: c.slug, name: c.name, hasApi: c.hasApiAccess !== false }));
      }
    } catch (e) {
      console.error("fiken companies failed", e instanceof Error ? e.message : e);
    }
  }
  const ac = t.accounting;

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
        {manager && (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="mb-1 text-sm font-semibold">{t.ui.logo.title}</h3>
            <LogoForm workspaceId={workspace.id} current={logoUrl(workspace.logo_path)} t={t.ui.logo} />
          </div>
        )}
        <p className="mt-4 text-sm text-muted">
          {s.subscription}: <strong className="text-foreground">{t.common.plans[workspace.plan]}</strong>. {s.unlimitedUsers}{" "}
          {manager && (
            <Link href="/app/abonnement" className="text-brand hover:underline">
              {t.subscription.link} →
            </Link>
          )}
        </p>
      </Card>

      {manager && (
        <Card>
          <h2 className="mb-1 font-semibold">{t.customize.title}</h2>
          <p className="mb-3 text-sm text-muted">{t.customize.intro}</p>
          <ul className="space-y-1 text-sm">
            {(
              [
                ["/app/innstillinger/salgsfaser", t.customize.stages.link],
                ["/app/innstillinger/skjema", t.leads.link],
                ["/app/innstillinger/e-postmaler", t.emails.templatesLink],
                ["/app/duplikater", t.dupes.link],
                ["/app/innstillinger/felt", t.customize.fieldsLink],
                ["/app/innstillinger/automatisering", t.customize.autoLink],
                ["/app/tilbud/innstillinger", t.customize.quoteLink],
              ] as const
            ).map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-brand hover:underline">
                  {label} →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 id="brukere" className="mb-1 font-semibold">
          {s.users}
        </h2>
        <p className="text-sm text-muted">
          {s.usersMoved}{" "}
          <Link href="/app/team" className="text-brand hover:underline">
            {t.nav.team} →
          </Link>
        </p>
      </Card>

      <Card>
        <h2 id="regnskap" className="mb-3 scroll-mt-20 font-semibold">
          {ac.title}
        </h2>
        <AccountingCard
          t={{
            intro: ac.intro,
            tripletex: ac.tripletex,
            soon: ac.soon,
            tokenLabel: ac.tokenLabel,
            tokenHelp: ac.tokenHelp,
            connect: ac.connect,
            connecting: ac.connecting,
            connectedTo: ac.connectedTo,
            lastSync: ac.lastSync,
            neverSynced: ac.neverSynced,
            syncError: ac.syncError,
            syncNow: ac.syncNow,
            syncing: ac.syncing,
            autoSync: ac.autoSync,
            disconnect: ac.disconnect,
            confirmDisconnect: ac.confirmDisconnect,
            overdueNote: ac.overdueNote,
            notIncluded: ac.notIncluded,
            onlyAdmins: ac.onlyAdmins,
            fiken: ac.fiken,
            fikenIntro: ac.fikenIntro,
            fikenConnect: ac.fikenConnect,
            fikenChoose: ac.fikenChoose,
            fikenChooseButton: ac.fikenChooseButton,
            fikenNoApiTag: ac.fikenNoApiTag,
            fikenNoApi: ac.fikenNoApi,
            confirmDisconnectFiken: ac.confirmDisconnectFiken,
            fikenAccessNote: ac.fikenAccessNote,
            fikenNotReady: ac.fikenNotReady,
          }}
          tripletex={tripletex}
          fiken={fiken}
          fikenCompanies={fikenChoices}
          fikenReady={fikenEnabled()}
          flash={
            (
              {
                ok: { tone: "success", text: ac.fikenOk },
                velg: null,
                api: { tone: "error", text: ac.fikenNoApi },
                ingen: { tone: "error", text: ac.fikenNone },
                avbrutt: { tone: "error", text: ac.fikenCancelled },
                synkfeil: { tone: "error", text: ac.fikenSyncFailed },
                feil: { tone: "error", text: ac.fikenFailed },
              } as Record<string, { tone: "success" | "error"; text: string } | null>
            )[String(sp.fiken ?? "")] ?? null
          }
          manager={manager}
          allowed={!!billing && hasAccountingAccess(billing)}
        />
      </Card>

      {manager && (
        <Card>
          <h2 className="mb-1 font-semibold">{t.exportData.title}</h2>
          <p className="mb-4 text-sm text-muted">{t.exportData.intro}</p>
          <div className="flex flex-wrap gap-3">
            <a href="/app/eksport?type=kontakter" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
              ⬇ {t.exportData.contacts}
            </a>
            <a href="/app/eksport?type=bedrifter" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
              ⬇ {t.exportData.companies}
            </a>
            <a href="/app/import" className="px-2 py-2 text-sm text-brand hover:underline">
              {t.import.title}
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
