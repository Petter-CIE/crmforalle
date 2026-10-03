import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, Input } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { saveQuoteSettings } from "@/app/app/innstillinger/customize-actions";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.quotes.settingsTitle };
}

export default async function QuoteSettingsPage() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) notFound();
  const { t } = await getI18n();
  const q = t.quotes;
  const { data: w } = await supabase
    .from("workspaces")
    .select("quote_address, quote_email, quote_phone, quote_bank_account, quote_terms, quote_valid_days")
    .eq("id", workspace.id)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader title={q.settingsTitle} subtitle={q.settingsIntro} backHref="/app/tilbud" backLabel={q.title} />
      <Card>
        <ActionForm action={saveQuoteSettings} submitLabel={t.crm.save} pendingLabel={t.crm.saving} successText={q.settingsSaved}>
          <p className="text-sm">
            <span className="font-medium">{workspace.name}</span>
            {workspace.org_number && <span className="text-muted"> · {q.orgNr} {workspace.org_number}</span>}
          </p>
          <Field label={q.address} htmlFor="qs_address">
            <Input id="qs_address" name="quote_address" maxLength={300} defaultValue={w?.quote_address ?? ""} placeholder="Gate 1, 5000 Bergen" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={q.email} htmlFor="qs_email">
              <Input id="qs_email" name="quote_email" type="email" maxLength={200} defaultValue={w?.quote_email ?? ""} />
            </Field>
            <Field label={q.phone} htmlFor="qs_phone">
              <Input id="qs_phone" name="quote_phone" maxLength={50} defaultValue={w?.quote_phone ?? ""} />
            </Field>
            <Field label={q.bankAccount} htmlFor="qs_bank">
              <Input id="qs_bank" name="quote_bank_account" maxLength={50} defaultValue={w?.quote_bank_account ?? ""} />
            </Field>
          </div>
          <Field label={q.validDays} htmlFor="qs_days">
            <Input id="qs_days" name="quote_valid_days" type="number" min={1} max={365} defaultValue={w?.quote_valid_days ?? 30} className="max-w-[8rem]" />
          </Field>
          <Field label={q.defaultTerms} htmlFor="qs_terms">
            <Textarea id="qs_terms" name="quote_terms" rows={4} maxLength={5000} defaultValue={w?.quote_terms ?? ""} placeholder={q.termsPlaceholder} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
