import "server-only";
import { cookies, headers } from "next/headers";
import { DATE_LOCALE, DEFAULT_LOCALE, dictionaries, isLocale, LOCALE_COOKIE, type Locale } from "./dictionaries";

/** Cookie choice first, then the browser's language (Norwegian → nb, otherwise en). */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  if (!accept) return DEFAULT_LOCALE;
  const first = accept.split(",")[0]?.trim() ?? "";
  if (/^(nb|nn|no)\b/.test(first)) return "nb";
  if (/\b(nb|nn|no)\b/.test(accept) && !first.startsWith("en")) return "nb";
  return first.startsWith("en") ? "en" : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale], dateLocale: DATE_LOCALE[locale] };
}
