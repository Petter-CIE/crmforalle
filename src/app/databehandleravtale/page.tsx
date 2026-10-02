import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { dpa } from "@/content/legal/dpa";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: dpa[locale].title };
}

export default async function Page() {
  const { locale } = await getI18n();
  return <LegalPage doc={dpa[locale]} current="dpa" />;
}
