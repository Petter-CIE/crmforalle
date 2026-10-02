import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { terms } from "@/content/legal/terms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: terms[locale].title };
}

export default async function Page() {
  const { locale } = await getI18n();
  return <LegalPage doc={terms[locale]} current="terms" />;
}
