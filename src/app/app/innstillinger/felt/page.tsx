import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, Input, Select } from "@/components/ui";
import { EmptyState, Field, PageHeader, Textarea } from "@/components/ui-extra";
import { CUSTOM_ENTITIES, CUSTOM_TYPES, type CustomField } from "@/lib/custom-fields";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { createCustomField, deleteCustomField, moveCustomField } from "../customize-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.customize.fieldsTitle };
}

export default async function CustomFieldsPage() {
  const { supabase, workspace } = await requireWorkspace();
  if (!canManage(workspace.role)) notFound();
  const { t } = await getI18n();
  const c = t.customize;
  const { data } = await supabase
    .from("custom_fields")
    .select("id, entity, label, type, options")
    .eq("workspace_id", workspace.id)
    .order("position")
    .order("created_at");
  const all = (data ?? []) as (CustomField & { entity: string })[];

  return (
    <div className="space-y-6">
      <PageHeader title={c.fieldsTitle} subtitle={c.fieldsIntro} backHref="/app/innstillinger" backLabel={t.settings.title} />

      <Card>
        <h2 className="mb-4 font-semibold">{c.newField}</h2>
        <ActionForm action={createCustomField} submitLabel={c.addField} pendingLabel={t.crm.saving} resetOnSuccess successText={c.fieldAdded}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={c.fieldFor} htmlFor="cf_entity">
              <Select id="cf_entity" name="entity" className="w-full">
                {CUSTOM_ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {c.entities[e]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={c.fieldLabel} htmlFor="cf_label">
              <Input id="cf_label" name="label" required maxLength={60} placeholder={c.fieldLabelPlaceholder} />
            </Field>
            <Field label={c.fieldType} htmlFor="cf_type">
              <Select id="cf_type" name="type" className="w-full">
                {CUSTOM_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {c.types[ty]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={c.options} htmlFor="cf_options">
            <Textarea id="cf_options" name="options" rows={3} placeholder={c.optionsPlaceholder} />
          </Field>
          <p className="-mt-2 text-xs text-muted">{c.optionsHelp}</p>
        </ActionForm>
      </Card>

      {CUSTOM_ENTITIES.map((entity) => {
        const fields = all.filter((f) => f.entity === entity);
        return (
          <Card key={entity}>
            <h2 className="mb-3 font-semibold">{c.entitiesPlural[entity]}</h2>
            {fields.length === 0 ? (
              <EmptyState>{c.noFields}</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {fields.map((f, i) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{f.label}</span>{" "}
                      <span className="text-xs text-muted">
                        · {c.types[f.type]}
                        {f.type === "select" && f.options.length > 0 && `: ${f.options.join(", ")}`}
                      </span>
                    </span>
                    <form action={moveCustomField} className="flex gap-1">
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        name="dir"
                        value="up"
                        disabled={i === 0}
                        aria-label={c.moveUp}
                        className="rounded px-2 py-1 text-muted hover:bg-background disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="submit"
                        name="dir"
                        value="down"
                        disabled={i === fields.length - 1}
                        aria-label={c.moveDown}
                        className="rounded px-2 py-1 text-muted hover:bg-background disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={deleteCustomField}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton variant="danger" className="!px-2 !py-1 text-xs" message={c.deleteFieldConfirm(f.label)}>
                        {t.crm.delete}
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
