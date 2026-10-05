import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, Notice } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { brevoEnabled } from "@/lib/brevo";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { createCampaign } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.campaigns.title };
}

const tone: Record<string, string> = {
  draft: "bg-background text-muted",
  queued: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  sent: "bg-brand-soft text-brand",
  cancelled: "bg-background text-muted",
};

/** Campaigns (newsletters) for owners and admins. */
export default async function CampaignsPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const c = t.campaigns;
  const header = <PageHeader title={c.title} subtitle={c.subtitle} backHref="/app/e-post" backLabel={t.inbound.title} />;
  if (!canManage(workspace.role)) {
    return (
      <div className="space-y-6">
        {header}
        <Notice>{c.onlyManagers}</Notice>
      </div>
    );
  }

  const [{ data: campaigns }, { data: usage }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, subject, status, recipients, sent, opened, created_at, queued_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("campaign_preview", { p_workspace: workspace.id, p_audience: { kind: "none" } }),
  ]);
  const u = usage as unknown as { quota: number; used: number } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        backHref="/app/e-post"
        backLabel={t.inbound.title}
        actions={
          <form action={createCampaign}>
            <Button type="submit">{c.newCampaign}</Button>
          </form>
        }
      />
      {!brevoEnabled() && <Notice>{c.notConfigured}</Notice>}
      {u && <p className="text-sm text-muted">{c.quota(u.used, u.quota)}</p>}
      <Card>
        {!campaigns || campaigns.length === 0 ? (
          <EmptyState>{c.empty}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {campaigns.map((x) => (
              <li key={x.id}>
                <Link href={`/app/e-post/kampanjer/${x.id}`} className="flex flex-col gap-1 py-3 hover:bg-background/60 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.name}</p>
                    <p className="truncate text-sm text-muted">{x.subject || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted">
                    {x.status !== "draft" && (
                      <span>
                        {x.sent}/{x.recipients} · {x.opened} {c.opened}
                      </span>
                    )}
                    <span>{formatDateTime(x.queued_at ?? x.created_at, dateLocale)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[x.status] ?? ""}`}>{c.status[x.status] ?? x.status}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
