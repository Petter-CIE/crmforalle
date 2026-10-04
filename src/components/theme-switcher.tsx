"use client";

import { useState } from "react";

export type Theme = "auto" | "light" | "dark";

function applyTheme(next: Theme) {
  document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
  const root = document.documentElement;
  if (next === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
}

/** Auto / light / dark. Stored in a cookie for this device and applied at once. */
export function ThemeSwitcher({
  initial,
  t,
  compact = false,
}: {
  initial: Theme;
  t: { theme: string; themeAuto: string; themeLight: string; themeDark: string };
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(initial);
  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }
  const options: { v: Theme; label: string; icon: string }[] = [
    { v: "auto", label: t.themeAuto, icon: "◐" },
    { v: "light", label: t.themeLight, icon: "☀" },
    { v: "dark", label: t.themeDark, icon: "☾" },
  ];
  return (
    <div role="radiogroup" aria-label={t.theme} className="inline-flex rounded-lg border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={theme === o.v}
          title={o.label}
          onClick={() => choose(o.v)}
          className={`rounded-md text-xs transition-colors ${compact ? "px-2 py-1" : "px-3 py-1.5"} ${
            theme === o.v ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          <span aria-hidden>{o.icon}</span>
          {compact ? <span className="sr-only">{o.label}</span> : <span className="ml-1.5">{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
