import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui-extra";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";
import { Importer } from "./importer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.import.title };
}

export default async function ImportPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const i = t.import;
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .eq("archived", false)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader title={i.title} backHref="/app/kontakter" backLabel={t.contacts.title} />
      <Importer
        projects={projects ?? []}
        t={{
          intro: i.intro,
          choose: i.choose,
          dropHint: i.dropHint,
          template: i.template,
          templateFile: i.templateFile,
          reading: i.reading,
          badFile: i.badFile,
          empty: i.empty,
          tooMany: i.tooMany(Number.NaN).replace("NaN", "{max}"),
          rows: i.rows(2).replace("2", "{n}"),
          rowsOne: i.rows(1),
          mapTitle: i.mapTitle,
          mapIntro: i.mapIntro,
          column: i.column,
          example: i.example,
          field: i.field,
          skip: i.skip,
          fields: i.fields,
          needName: i.needName,
          optionsTitle: i.optionsTitle,
          createCompanies: i.createCompanies,
          addToProject: i.addToProject,
          noProject: i.noProject,
          rules: i.rules,
          start: i.start(2).replace("2", "{n}"),
          importing: i.importing(1, 2).replace("1", "{done}").replace("2", "{total}"),
          doneTitle: i.doneTitle,
          resultContacts: i.resultContacts(2).replace("2", "{n}"),
          resultCompanies: i.resultCompanies(2).replace("2", "{n}"),
          resultDuplicates: i.resultDuplicates(2).replace("2", "{n}"),
          resultInvalid: i.resultInvalid(2).replace("2", "{n}"),
          resultLimit: i.resultLimit(2).replace("2", "{n}"),
          failed: i.failed,
          again: i.again,
          toContacts: i.toContacts,
          toCompanies: i.toCompanies,
        }}
      />
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{i.helpTitle}</h2>
          <p className="mt-1 text-sm text-muted">{i.helpText}</p>
        </div>
        <a
          href={`mailto:post@allseats.no?subject=${encodeURIComponent(`${i.helpSubject} – ${workspace.name}`)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {i.helpButton}
        </a>
      </Card>
    </div>
  );
}
