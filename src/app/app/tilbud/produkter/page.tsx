import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { DeleteButton } from "@/components/delete-button";
import { Card, Input, Select } from "@/components/ui";
import { EmptyHero, Field, PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { nok, VAT_RATES } from "@/lib/quotes";
import { requireWorkspace } from "@/lib/session";
import { createProduct, updateProduct } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.quotes.products };
}

type P = { id?: string; name: string; sku: string | null; unit: string; unit_price: number; vat_rate: number; description: string | null; active: boolean };

function ProductFields({ p, prefix, t }: { p?: P; prefix: string; t: Awaited<ReturnType<typeof getI18n>>["t"] }) {
  const q = t.quotes;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label={q.productName} htmlFor={`${prefix}_name`}>
          <Input id={`${prefix}_name`} name="name" required maxLength={200} defaultValue={p?.name} />
        </Field>
        <Field label={q.sku} htmlFor={`${prefix}_sku`}>
          <Input id={`${prefix}_sku`} name="sku" maxLength={60} defaultValue={p?.sku ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={q.price} htmlFor={`${prefix}_price`}>
          <Input id={`${prefix}_price`} name="unit_price" inputMode="decimal" required defaultValue={p ? String(p.unit_price) : ""} />
        </Field>
        <Field label={q.unit} htmlFor={`${prefix}_unit`}>
          <Input id={`${prefix}_unit`} name="unit" maxLength={20} defaultValue={p?.unit ?? "stk"} />
        </Field>
        <Field label={q.vat} htmlFor={`${prefix}_vat`}>
          <Select id={`${prefix}_vat`} name="vat_rate" defaultValue={String(p?.vat_rate ?? 25)} className="w-full">
            {VAT_RATES.map((v) => (
              <option key={v} value={v}>
                {v} %
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={q.productDescription} htmlFor={`${prefix}_desc`}>
        <Input id={`${prefix}_desc`} name="description" maxLength={2000} defaultValue={p?.description ?? ""} />
      </Field>
    </>
  );
}

export default async function ProductsPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t, dateLocale } = await getI18n();
  const q = t.quotes;
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, unit, unit_price, vat_rate, description, active")
    .eq("workspace_id", workspace.id)
    .order("active", { ascending: false })
    .order("name")
    .limit(1000);
  const products = (data ?? []).map((p) => ({ ...p, unit_price: Number(p.unit_price), vat_rate: Number(p.vat_rate) }));

  return (
    <div className="space-y-6">
      <PageHeader title={q.products} subtitle={q.productsIntro} backHref="/app/tilbud" backLabel={q.title} />
      <Card>
        <h2 className="mb-4 font-semibold">{q.newProduct}</h2>
        <ActionForm action={createProduct} submitLabel={q.addProductBtn} pendingLabel={t.crm.saving} resetOnSuccess successText={q.productAdded} className="space-y-3">
          <ProductFields prefix="np" t={t} />
        </ActionForm>
      </Card>

      <Card>
        {products.length === 0 ? (
          <EmptyHero icon="products" title={t.ui.empty.productsTitle} text={t.ui.empty.productsText} />
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} data-del={p.id} className="py-2">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={`min-w-0 flex-1 font-medium ${p.active ? "" : "text-muted line-through"}`}>
                      {p.name}
                      {p.sku && <span className="ml-2 text-xs font-normal text-muted">{p.sku}</span>}
                    </span>
                    <span className="tabular-nums">
                      {nok(p.unit_price, dateLocale)} / {p.unit}
                    </span>
                    <span className="text-xs text-muted">
                      {q.vat} {p.vat_rate} %
                    </span>
                    <span className="text-xs text-brand">{q.edit}</span>
                  </summary>
                  <div className="mt-3 rounded-lg bg-background p-4">
                    <ActionForm action={updateProduct} submitLabel={t.crm.save} pendingLabel={t.crm.saving} successText={t.settings.saved} className="space-y-3">
                      <input type="hidden" name="id" value={p.id} />
                      <ProductFields p={p} prefix={`p${p.id.slice(0, 8)}`} t={t} />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" value="1" defaultChecked={p.active} />
                        {q.active}
                      </label>
                    </ActionForm>
                    <div className="mt-3">
                      <DeleteButton kind="product" id={p.id} message={t.ui.deleted.product} className="!px-2 !py-1 text-xs">
                        {t.crm.delete}
                      </DeleteButton>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
