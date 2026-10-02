import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { Button, ButtonLink, Card } from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/ui-extra";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { disableInboundAddress, dismissInboundEmail, rotateInboundAddress } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.inbound.title };
}

const DOMAIN = process.env.INBOUND_DOMAIN ?? "allseats.no";

export default async function InboundPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const i = t.inbound;
  const manager = canManage(workspace.role);

  const [{ data: ws }, { data: waiting }, { data: recent }] = await Promise.all([
    supabase.from("workspaces").select("inbound_token").eq("id", workspace.id).single(),
    supabase
      .from("inbound_emails")
      .select("id, from_email, from_name, external_emails, subject, body, sent_at")
      .eq("workspace_id", workspace.id)
      .eq("status", "unmatched")
      .order("sent_at", { ascending: false })
      .limit(200),
    supabase
      .from("inbound_emails")
      .select("id, from_email, subject, sent_at, linked_count")
      .eq("workspace_id", workspace.id)
      .eq("status", "linked")
      .order("sent_at", { ascending: false })
      .limit(15),
  ]);
  const address = ws?.inbound_token ? `crm-${ws.inbound_token}@${DOMAIN}` : null;

  return (
    <div className="space-y-6">
      <PageHeader title={i.title} subtitle={i.subtitle} />

      <Card>
        <h2 className="font-semibold">{i.addressTitle}</h2>
        {address ? (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-sm">{address}</code>
              <CopyButton value={address} label={i.copy} copied={i.copied} />
            </div>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>{i.howBcc}</li>
              <li>{i.howForward}</li>
              <li>{i.howRule}</li>
              <li>{i.howMatch}</li>
            </ul>
            <p className="mt-3 text-xs text-muted">{i.secret}</p>
            {manager && (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={rotateInboundAddress}>
                  <ConfirmButton message={i.confirmRotate} variant="secondary">
                    {i.rotate}
                  </ConfirmButton>
                </form>
                <form action={disableInboundAddress}>
                  <ConfirmButton message={i.confirmDisable} variant="danger">
                    {i.disable}
                  </ConfirmButton>
                </form>
              </div>
            )}
          </>
        ) : manager ? (
          <>
            <p className="mt-1 text-sm text-muted">{i.intro}</p>
            <form action={rotateInboundAddress} className="mt-4">
              <Button type="submit">{i.create}</Button>
            </form>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">{i.askAdmin}</p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">
          {i.waitingTitle} ({waiting?.length ?? 0})
        </h2>
        <p className="mb-3 text-sm text-muted">{i.waitingIntro}</p>
        {!waiting || waiting.length === 0 ? (
          <EmptyState>{i.waitingEmpty}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {waiting.map((m) => {
              const who = m.external_emails[0] ?? m.from_email;
              const name = who === m.from_email ? (m.from_name ?? "") : "";
              return (
                <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.subject || "—"}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(m.sent_at, dateLocale)} · {i.with}: {m.external_emails.join(", ") || m.from_email}
                    </p>
                    {m.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{m.body}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ButtonLink
                      href={`/app/kontakter/ny?epost=${encodeURIComponent(who)}&navn=${encodeURIComponent(name)}`}
                      variant="secondary"
                      className="!px-3 !py-1.5"
                    >
                      + {i.createContact}
                    </ButtonLink>
                    <form action={dismissInboundEmail}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="px-2 py-1.5 text-sm text-muted hover:text-danger">
                        {i.dismiss}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {recent && recent.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">{i.recentTitle}</h2>
          <ul className="divide-y divide-border text-sm">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{m.subject || "—"}</span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDateTime(m.sent_at, dateLocale)} · {i.linkedTo.replace("{n}", String(m.linked_count))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {i.recentHint} <Link href="/app/kontakter" className="text-brand hover:underline">{t.contacts.title}</Link>
          </p>
        </Card>
      )}
    </div>
  );
}
