import Link from "next/link";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { formatDateTime } from "@/lib/crm";
import { getI18n } from "@/lib/i18n/server";
import { setFeedbackHandledAdmin } from "../actions";
import { adminStatus } from "../guard";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/tilbakemeldinger">) {
  const sp = await searchParams;
  const showAll = sp.alle === "1";
  const { supabase } = await adminStatus();
  const { t, dateLocale } = await getI18n();
  const a = t.admin;
  const { data } = await supabase.rpc("admin_feedback", { p_limit: 300 });
  const items = (data ?? []).filter((f) => showAll || !f.handled_at);
  const kindStyle = { idea: "bg-brand-soft text-brand", bug: "bg-red-50 text-danger", other: "bg-background text-muted" } as Record<string, string>;

  return (
    <div className="space-y-6">
      <PageHeader title={a.feedbackTitle} backHref="/admin" backLabel={a.back} />
      <div className="flex gap-2 text-sm">
        <Link href="/admin/tilbakemeldinger" className={`rounded-full border px-3 py-1 ${showAll ? "border-border" : "border-brand bg-brand-soft text-brand"}`}>
          {a.feedbackOpenOnly}
        </Link>
        <Link href="/admin/tilbakemeldinger?alle=1" className={`rounded-full border px-3 py-1 ${showAll ? "border-brand bg-brand-soft text-brand" : "border-border"}`}>
          {a.feedbackAll}
        </Link>
      </div>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">{a.feedbackEmpty}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id}>
              <Card className={f.handled_at ? "opacity-60" : ""}>
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${kindStyle[f.kind] ?? kindStyle.other}`}>
                    {t.feedback.kinds[f.kind as "idea" | "bug" | "other"] ?? f.kind}
                  </span>
                  <Link href={`/admin/${f.workspace_id}`} className="font-medium text-foreground hover:underline">
                    {f.workspace}
                  </Link>
                  {f.pilot && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">⭐ {a.pilot}</span>}
                  <span>
                    {f.sender_name || f.sender_email}
                    {f.sender_name && f.sender_email ? ` · ${f.sender_email}` : ""}
                  </span>
                  <span>{formatDateTime(f.created_at, dateLocale)}</span>
                  {f.page && <code>{f.page}</code>}
                </div>
                <p className="whitespace-pre-wrap text-sm">{f.message}</p>
                <form action={setFeedbackHandledAdmin} className="mt-3 flex items-center gap-3">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="handled" value={f.handled_at ? "0" : "1"} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background">
                    {f.handled_at ? a.feedbackReopen : `✓ ${a.feedbackMarkHandled}`}
                  </button>
                  {f.sender_email && (
                    <a href={`mailto:${f.sender_email}?subject=${encodeURIComponent("Tilbakemelding AllSeats")}`} className="text-xs text-brand hover:underline">
                      ✉ {f.sender_email}
                    </a>
                  )}
                  {f.handled_at && (
                    <span className="text-xs text-muted">
                      {a.feedbackHandled} {formatDateTime(f.handled_at, dateLocale)}
                    </span>
                  )}
                </form>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
