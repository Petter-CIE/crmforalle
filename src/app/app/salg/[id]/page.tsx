import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { TaskPanel } from "@/components/crm/task-list";
import { Timeline } from "@/components/crm/timeline";
import { Button, Card, Input } from "@/components/ui";
import { PageHeader, Pill } from "@/components/ui-extra";
import { deleteDeal, setDealStage, updateDeal } from "@/app/app/crm-actions";
import { contactName, formatDate, formatMoney } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { CustomFieldInputs } from "@/components/crm/custom-fields";
import { asCustomValues, loadCustomFields } from "@/lib/custom-fields";
import { DealFields } from "../deal-fields";
import { createQuote } from "../../tilbud/actions";
import { StatusBadge } from "../../tilbud/status-badge";
import type { QuoteStatus } from "@/lib/quotes";
import { loadDealOptions } from "../options";

export async function generateMetadata({ params }: PageProps<"/app/salg/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase.from("deals").select("title").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  return { title: data?.title ?? "" };
}

export default async function DealPage({ params }: PageProps<"/app/salg/[id]">) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const { supabase, workspace } = ctx;
  const { t, dateLocale } = await getI18n();
  const [{ data: d }, options, { data: stages }, fields, { data: quotes }] = await Promise.all([
    supabase
      .from("deals")
      .select("*, pipeline_stages(name, is_won, is_lost), companies(id, name), contacts(id, first_name, last_name), projects(id, name)")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    loadDealOptions(ctx),
    supabase.from("pipeline_stages").select("id, is_won, is_lost, position").eq("workspace_id", workspace.id).order("position"),
    loadCustomFields(supabase, workspace.id, "deal"),
    supabase
      .from("quotes")
      .select("id, number, title, status, total, view_count")
      .eq("workspace_id", workspace.id)
      .eq("deal_id", id)
      .order("number", { ascending: false }),
  ]);
  if (!d) notFound();
  const path = `/app/salg/${id}`;
  const wonStage = stages?.find((s) => s.is_won);
  const lostStage = stages?.find((s) => s.is_lost);
  const firstOpen = stages?.find((s) => !s.is_won && !s.is_lost);
  const closed = d.pipeline_stages?.is_won || d.pipeline_stages?.is_lost;

  return (
    <div className="space-y-6">
      <PageHeader
        title={d.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Pill className={d.pipeline_stages?.is_won ? "!bg-brand-soft text-brand" : d.pipeline_stages?.is_lost ? "!bg-red-50 text-danger" : ""}>
              {d.pipeline_stages?.name}
            </Pill>
            <strong className="text-foreground">{formatMoney(Number(d.value), dateLocale)}</strong>
            {d.companies && (
              <Link href={`/app/bedrifter/${d.companies.id}`} className="hover:underline">
                {d.companies.name}
              </Link>
            )}
            {d.contacts && (
              <Link href={`/app/kontakter/${d.contacts.id}`} className="hover:underline">
                {contactName(d.contacts)}
              </Link>
            )}
            {d.projects && (
              <Link href={`/app/prosjekter/${d.projects.id}`} className="hover:underline">
                {d.projects.name}
              </Link>
            )}
            {d.closed_at && <span>· {formatDate(d.closed_at, dateLocale)}</span>}
          </span>
        }
        backHref="/app/salg"
        backLabel={t.deals.title}
        actions={
          <>
            {!closed && wonStage && (
              <form action={setDealStage}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="stage_id" value={wonStage.id} />
                <Button type="submit">✓ {t.deals.markWon}</Button>
              </form>
            )}
            {closed && firstOpen && (
              <form action={setDealStage}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="stage_id" value={firstOpen.id} />
                <Button type="submit" variant="secondary">
                  {t.deals.reopen}
                </Button>
              </form>
            )}
            <form action={deleteDeal}>
              <input type="hidden" name="id" value={id} />
              <ConfirmButton message={t.crm.confirmDelete} variant="danger">
                {t.crm.delete}
              </ConfirmButton>
            </form>
          </>
        }
      />
      {d.pipeline_stages?.is_lost && d.lost_reason && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {t.deals.lostReason} {d.lost_reason}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">{t.deals.edit}</h2>
            <ActionForm action={updateDeal} submitLabel={t.crm.save} pendingLabel={t.crm.saving} successText={t.settings.saved}>
              <input type="hidden" name="id" value={id} />
              <DealFields
                t={t}
                options={options}
                initial={{
                  ...d,
                  company: d.companies ? { id: d.companies.id, label: d.companies.name } : null,
                  contact: d.contacts ? { id: d.contacts.id, label: contactName(d.contacts) } : null,
                }}
              />
              <CustomFieldInputs fields={fields} values={asCustomValues(d.custom)} t={{ choose: t.crm.choose, title: t.crm.customFields }} />
            </ActionForm>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t.crm.timeline}</h2>
            <Timeline filter={{ deal_id: id }} links={{ deal_id: id, company_id: d.company_id, contact_id: d.contact_id }} path={path} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t.quotes.onDeal}</h2>
              <form action={createQuote}>
                <input type="hidden" name="deal_id" value={id} />
                <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">
                  + {t.quotes.fromDeal}
                </Button>
              </form>
            </div>
            {(quotes ?? []).length === 0 ? (
              <p className="text-sm text-muted">{t.quotes.noneOnDeal}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(quotes ?? []).map((qt) => (
                  <li key={qt.id} className="flex items-center justify-between gap-2 py-1.5">
                    <Link href={`/app/tilbud/${qt.id}`} className="min-w-0 truncate hover:text-brand">
                      #{qt.number} {qt.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-muted">{formatMoney(Number(qt.total), dateLocale)}</span>
                      <StatusBadge status={qt.status as QuoteStatus} label={t.quotes.statuses[qt.status as QuoteStatus]} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t.tasks.title}</h2>
            <TaskPanel links={{ deal_id: id, company_id: d.company_id, contact_id: d.contact_id }} path={path} />
          </Card>
          {!closed && lostStage && (
            <Card>
              <h2 className="mb-3 font-semibold">{t.deals.markLost}</h2>
              <form action={setDealStage} className="space-y-2">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="stage_id" value={lostStage.id} />
                <Input name="lost_reason" placeholder={t.deals.lostReason} aria-label={t.deals.lostReason} />
                <Button type="submit" variant="secondary" className="w-full">
                  {t.deals.markLost}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
