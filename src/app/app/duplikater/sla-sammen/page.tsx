import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { contactName, formatDate } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { canManage, requireWorkspace } from "@/lib/session";
import { mergeRecords } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dupes.mergeTitle };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MergePage({ searchParams }: PageProps<"/app/duplikater/sla-sammen">) {
  const sp = await searchParams;
  const type = sp.type === "contact" ? "contact" : "company";
  const a = typeof sp.a === "string" && UUID.test(sp.a) ? sp.a : null;
  const b = typeof sp.b === "string" && UUID.test(sp.b) ? sp.b : null;
  const { supabase, workspace } = await requireWorkspace();
  if (!a || !b || !canManage(workspace.role)) notFound();
  const { t, dateLocale } = await getI18n();
  const d = t.dupes;

  type Side = { id: string; title: string; lines: (string | null)[]; created: string; related: string };
  let sides: Side[] = [];
  if (type === "company") {
    const { data } = await supabase
      .from("companies")
      .select("id, name, org_number, address, postal_code, city, email, phone, website, created_at, contacts(count), deals(count), activities(count)")
      .in("id", [a, b])
      .eq("workspace_id", workspace.id);
    sides = (data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      lines: [c.org_number && `${t.companies.orgNumber} ${c.org_number}`, [c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", "), c.email, c.phone, c.website],
      created: c.created_at,
      related: d.related(c.contacts?.[0]?.count ?? 0, c.deals?.[0]?.count ?? 0, c.activities?.[0]?.count ?? 0),
    }));
  } else {
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, title, email, phone, created_at, companies(name), deals(count), activities(count)")
      .in("id", [a, b])
      .eq("workspace_id", workspace.id);
    sides = (data ?? []).map((c) => ({
      id: c.id,
      title: contactName(c),
      lines: [c.title, c.companies?.name ?? null, c.email, c.phone],
      created: c.created_at,
      related: d.relatedContact(c.deals?.[0]?.count ?? 0, c.activities?.[0]?.count ?? 0),
    }));
  }
  if (sides.length !== 2) notFound();
  // Suggest keeping the one with the most history (the oldest when equal).
  sides.sort((x, y) => x.created.localeCompare(y.created));

  return (
    <div className="space-y-6">
      <PageHeader title={d.mergeTitle} subtitle={d.mergeIntro} backHref={type === "company" ? "/app/duplikater" : "/app/duplikater?type=kontakter"} backLabel={d.title} />
      <ActionForm action={mergeRecords} submitLabel={d.confirm} pendingLabel={d.merging}>
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="a" value={a} />
        <input type="hidden" name="b" value={b} />
        <div className="grid gap-4 md:grid-cols-2">
          {sides.map((s, i) => (
            <label key={s.id} className="block cursor-pointer">
              <input type="radio" name="keep" value={s.id} defaultChecked={i === 0} className="peer sr-only" />
              <Card className="h-full transition-colors peer-checked:border-brand peer-checked:ring-2 peer-checked:ring-brand/30">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar name={s.title} size="md" className={type === "company" ? "!rounded-lg" : ""} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-xs text-muted">
                      {d.created} {formatDate(s.created, dateLocale)}
                    </p>
                  </div>
                </div>
                <ul className="space-y-0.5 text-sm">
                  {s.lines.filter(Boolean).map((l) => (
                    <li key={l} className="truncate">
                      {l}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">{s.related}</p>
                <p className="mt-3 text-sm font-medium text-muted [label:has(input:checked)_&]:text-brand">
                  <span className="[label:has(input:checked)_&]:hidden">○</span>
                  <span className="hidden [label:has(input:checked)_&]:inline">◉</span> {d.keep}
                </p>
              </Card>
            </label>
          ))}
        </div>
      </ActionForm>
    </div>
  );
}
