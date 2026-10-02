import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, Input, Select } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { formatDate, formatDateTime, formatMoney } from "@/lib/crm";
import type { PlanType } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { monthlyPrice, PLAN_PRICE } from "@/lib/pricing";
import { nowMs } from "@/lib/time";
import { updateWorkspaceAdmin } from "../actions";
import { adminStatus } from "../guard";
import { TrialInput } from "./trial-input";

const PLANS: PlanType[] = ["trial", "start", "bedrift", "free"];
const osloDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

function describe(value: unknown) {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

export default async function AdminWorkspacePage({ params }: PageProps<"/admin/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await adminStatus();
  const { t, dateLocale } = await getI18n();
  const a = t.admin;

  const [{ data: all }, { data: members }, { data: log }] = await Promise.all([
    supabase.rpc("admin_workspaces"),
    supabase.rpc("admin_workspace_members", { p_id: id }),
    supabase.rpc("admin_audit_log", { p_id: id }),
  ]);
  const w = (all ?? []).find((x) => x.id === id);
  if (!w) notFound();
  const today = new Date(nowMs()).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={w.name}
        subtitle={[w.org_number, `${a.created} ${formatDate(w.created_at, dateLocale)}`].filter(Boolean).join(" · ")}
        backHref="/admin"
        backLabel={a.back}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">
              {a.team} ({members?.length ?? 0})
            </h2>
            <ul className="divide-y divide-border text-sm">
              {(members ?? []).map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.full_name || m.email}</p>
                    {m.full_name && <p className="text-xs text-muted">{m.email}</p>}
                  </div>
                  <span className="text-xs text-muted">{t.common.roles[m.role]}</span>
                  <span className="w-44 text-right text-xs text-muted">
                    {a.lastLogin}: {m.last_sign_in_at ? formatDateTime(m.last_sign_in_at, dateLocale) : a.never}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              {a.contacts}: {w.contact_count} / {w.contact_limit} · {a.lastActivity}:{" "}
              {w.last_activity ? formatDateTime(w.last_activity, dateLocale) : "–"}
            </p>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{a.history}</h2>
            {!log || log.length === 0 ? (
              <p className="text-sm text-muted">{a.noHistory}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {log.map((entry, i) => (
                  <li key={i}>
                    <p className="text-xs text-muted">
                      {formatDateTime(entry.created_at, dateLocale)} {a.by} {entry.admin_email ?? "?"}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries((entry.changes ?? {}) as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => (
                        <li key={k} className="font-mono text-xs">
                          {k}: <span className="text-muted line-through">{describe(v.from)}</span> → {describe(v.to)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="mb-1 font-semibold">{a.subscription}</h2>
          <p className="mb-4 text-sm text-muted">
            {a.price}: <span className="font-medium text-foreground">{formatMoney(monthlyPrice(w, today), dateLocale)}</span>
          </p>
          <ActionForm action={updateWorkspaceAdmin} submitLabel={a.save} pendingLabel={t.crm.saving} successText={a.saved}>
            <input type="hidden" name="id" value={w.id} />
            <Field label={a.plan} htmlFor="a_plan">
              <Select id="a_plan" name="plan" defaultValue={w.plan} className="w-full">
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {t.common.plans[p]}
                    {PLAN_PRICE[p] ? ` – ${formatMoney(PLAN_PRICE[p], dateLocale)}` : ""}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">{a.planHelp}</p>
            </Field>
            <Field label={a.trialEnds} htmlFor="a_trial">
              <TrialInput initial={osloDate(w.trial_ends_at)} labels={{ d7: a.extend(7), d14: a.extend(14), d30: a.extend(30) }} />
            </Field>
            <Field label={a.contactLimit} htmlFor="a_limit">
              <Input id="a_limit" name="contact_limit" type="number" min={0} defaultValue={w.contact_limit} className="w-full" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={a.discount} htmlFor="a_disc">
                <Input id="a_disc" name="discount_percent" type="number" min={0} max={100} defaultValue={w.discount_percent} className="w-full" />
              </Field>
              <Field label={a.discountUntil} htmlFor="a_until">
                <Input id="a_until" name="discount_until" type="date" defaultValue={w.discount_until ?? ""} className="w-full" />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-muted">{a.discountUntilHelp}</p>
            <Field label={a.discountNote} htmlFor="a_dnote">
              <Input id="a_dnote" name="discount_note" defaultValue={w.discount_note ?? ""} className="w-full" />
            </Field>
            <Field label={a.adminNote} htmlFor="a_note">
              <Textarea id="a_note" name="admin_note" rows={4} defaultValue={w.admin_note ?? ""} />
            </Field>
            <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <input type="checkbox" name="suspended" value="1" defaultChecked={!!w.suspended_at} className="mt-0.5" />
              <span>
                <span className="font-medium text-red-900">{a.suspend}</span>
                <span className="block text-xs text-red-800">
                  {a.suspendHelp}
                  {w.suspended_at && ` (${a.since(formatDate(w.suspended_at, dateLocale))})`}
                </span>
              </span>
            </label>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
