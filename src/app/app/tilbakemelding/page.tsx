import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card, Notice } from "@/components/ui";
import { Field, PageHeader, Textarea } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { sendFeedback } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.feedback.title };
}

export default async function FeedbackPage({ searchParams }: PageProps<"/app/tilbakemelding">) {
  const sp = await searchParams;
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const f = t.feedback;
  const from = typeof sp.fra === "string" && /^\/app[\w\-/]*$/.test(sp.fra) && sp.fra !== "/app/tilbakemelding" ? sp.fra : "";
  const { data: w } = await supabase.from("workspaces").select("pilot_at").eq("id", workspace.id).maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeader title={f.title} subtitle={f.intro} />
      {w?.pilot_at && <Notice>⭐ {f.pilotThanks}</Notice>}
      <Card className="max-w-2xl">
        <ActionForm action={sendFeedback} submitLabel={f.send} pendingLabel={f.sending} resetOnSuccess>
          <input type="hidden" name="page" value={from} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{f.kind}</legend>
            <div className="flex flex-wrap gap-2">
              {(["idea", "bug", "other"] as const).map((k, i) => (
                <label
                  key={k}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
                >
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="sr-only" />
                  {f.kinds[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={f.message} htmlFor="fb_message">
            <Textarea id="fb_message" name="message" rows={6} required minLength={3} maxLength={5000} placeholder={f.placeholder} className="w-full" />
          </Field>
          {from && (
            <p className="text-xs text-muted">
              {f.page}: <code>{from}</code>
            </p>
          )}
        </ActionForm>
      </Card>
    </div>
  );
}
