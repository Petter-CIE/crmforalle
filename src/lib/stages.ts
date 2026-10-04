import type { Locale } from "@/lib/i18n/dictionaries";

/** The stages every new company starts with, in each language (same order as the seed in the database). */
export const DEFAULT_STAGES: Record<Locale, string>[] = [
  { nb: "Ny henvendelse", en: "New lead" },
  { nb: "Kontaktet", en: "Contacted" },
  { nb: "Tilbud sendt", en: "Quote sent" },
  { nb: "Forhandling", en: "Negotiation" },
  { nb: "Vunnet", en: "Won" },
  { nb: "Tapt", en: "Lost" },
];

/**
 * Name of a pipeline stage as the current user should see it: a default name the company has not
 * changed is shown in the user's language; names the company chose itself are shown as written.
 */
export function stageName(name: string, locale: Locale) {
  const hit = DEFAULT_STAGES.find((d) => d.nb === name || d.en === name);
  return hit ? hit[locale] : name;
}
