import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.tasks };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.nav.tasks}</h1>
      <Card>
        <p className="text-sm text-muted">{t.placeholders.tasks}</p>
      </Card>
    </div>
  );
}
