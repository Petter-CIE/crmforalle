import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacy } from "@/content/legal/privacy";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: privacy[locale].title };
}

export default async function Page() {
  const { locale } = await getI18n();
  return <LegalPage doc={privacy[locale]} current="privacy" />;
}
