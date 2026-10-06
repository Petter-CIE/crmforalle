import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, Notice } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { brevoEnabled } from "@/lib/brevo";
import { formatDateTime, listMembers } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { cancelCampaign, deleteCampaign, type Audience } from "../actions";
import { CampaignEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.campaigns.title };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CampaignPage({ params, searchParams }: PageProps<"/app/e-post/kampanjer/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t, locale, dateLocale } = await getI18n();
  const c = t.campaigns;
  if (!canManage(workspace.role)) notFound();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, subject, body, audience, status, recipients, sent, failed, opened, unsubscribed, created_at, queued_at, finished_at")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!campaign) notFound();
  const back = { backHref: "/app/e-post/kampanjer", backLabel: c.back };

  if (campaign.status === "draft") {
    const [{ data: projects }, owners, { data: ws }] = await Promise.all([
      supabase.from("projects").select("id, name").eq("workspace_id", workspace.id).eq("archived", false).order("name"),
      listMembers(ctx),
      supabase.from("workspaces").select("name, quote_address").eq("id", workspace.id).single(),
    ]);
    return (
      <div className="space-y-6">
        <PageHeader
          title={campaign.name}
          subtitle={c.status.draft}
          {...back}
          actions={
            <form action={deleteCampaign}>
              <input type="hidden" name="id" value={campaign.id} />
              <ConfirmButton message={c.confirmDelete} variant="danger">
                {c.delete}
              </ConfirmButton>
            </form>
          }
        />
        {!brevoEnabled() && <Notice>{c.notConfigured}</Notice>}
        <Card>
          <CampaignEditor
            campaign={{ id: campaign.id, name: campaign.name, subject: campaign.subject, body: campaign.body, audience: (campaign.audience ?? {}) as Audience }}
            projects={projects ?? []}
            owners={owners}
            company={{ name: ws?.name ?? workspace.name, address: ws?.quote_address ?? null }}
            locale={locale}
          />
        </Card>
      </div>
    );
  }

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, email, first_name, last_name, company_name, status, error, sent_at, opened_at, unsubscribed_at")
    .eq("campaign_id", campaign.id)
    .order("created_at")
    .limit(1000);
  const stat = (label: string, value: number) => (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        subtitle={`${c.status[campaign.status] ?? campaign.status} · ${c.sentAt} ${formatDateTime(campaign.queued_at ?? campaign.created_at, dateLocale)}`}
        {...back}
        actions={
          campaign.status === "queued" ? (
            <form action={cancelCampaign}>
              <input type="hidden" name="id" value={campaign.id} />
              <ConfirmButton message={c.confirmCancel} variant="secondary">
                {c.cancel}
              </ConfirmButton>
            </form>
          ) : campaign.status === "cancelled" ? (
            <form action={deleteCampaign}>
              <input type="hidden" name="id" value={campaign.id} />
              <ConfirmButton message={c.confirmDelete} variant="danger">
                {c.delete}
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />
      {sp.sendt === "1" && campaign.status === "queued" && <Notice>{c.queued(campaign.recipients)}</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stat(c.stats.recipients, campaign.recipients)}
        {stat(c.stats.sent, campaign.sent)}
        {stat(c.stats.opened, campaign.opened)}
        {stat(c.stats.failed, campaign.failed)}
        {stat(c.stats.unsubscribed, campaign.unsubscribed)}
      </div>
      <p className="text-xs text-muted">{c.openedNote}</p>

      <Card>
        <p className="text-sm text-muted">{c.subject}</p>
        <p className="font-medium">{campaign.subject}</p>
        <p className="mt-3 whitespace-pre-line text-sm text-muted">{campaign.body}</p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">
          {c.recipientsTitle} ({campaign.recipients})
        </h2>
        <ul className="divide-y divide-border text-sm">
          {(recipients ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 truncate">
                {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email}
                <span className="text-muted">
                  {" "}
                  · {r.email}
                  {r.company_name ? ` · ${r.company_name}` : ""}
                </span>
              </span>
              <span className="text-xs text-muted">
                {c.recipientStatus[r.status] ?? r.status}
                {r.opened_at ? ` · ${c.opened}` : ""}
                {r.unsubscribed_at ? ` · ${c.unsubscribedLabel}` : ""}
                {r.error ? ` · ${r.error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
