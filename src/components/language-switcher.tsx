"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n/dictionaries";

const LABELS: Record<Locale, string> = { nb: "Norsk", en: "English" };

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = pathname + (search ? `?${search}` : "");
  return (
    <div className="flex items-center gap-1 text-xs" aria-label={label} role="group">
      {(Object.keys(LABELS) as Locale[]).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted/50">·</span>}
          {l === locale ? (
            <span aria-current="true" className="font-medium text-foreground">
              {LABELS[l]}
            </span>
          ) : (
            <a href={`/sprak?l=${l}&neste=${encodeURIComponent(here)}`} hrefLang={l} className="text-muted hover:text-foreground hover:underline">
              {LABELS[l]}
            </a>
          )}
        </span>
      ))}
    </div>
  );
}
