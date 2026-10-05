"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveNavPrefs } from "@/app/app/actions";
import { ALWAYS_VISIBLE, type NavKey } from "@/lib/nav-items";

export type NavItem = { key: NavKey; href: string; label: string; hidden: boolean };
export type NavTexts = {
  mainMenu: string;
  customize: string;
  customizeHint: string;
  save: string;
  saving: string;
  cancel: string;
  reset: string;
  moveUp: string;
  moveDown: string;
  /** Contains {label}. */
  show: string;
};

/** Side menu on larger screens. The pencil below it lets each user reorder and hide sections. */
export function Nav({ items, t }: { items: NavItem[]; t: NavTexts }) {
  const pathname = usePathname();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);
  const [pending, start] = useTransition();

  function move(i: number, by: -1 | 1) {
    const j = i + by;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  }

  function save(prefs: { order: NavKey[]; hidden: NavKey[] } | null) {
    start(async () => {
      await saveNavPrefs(prefs);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="hidden space-y-2 md:block">
        <p className="px-1 text-xs text-muted">{t.customizeHint}</p>
        <ul aria-label={t.customize} className="space-y-1">
          {draft.map((item, i) => {
            const locked = ALWAYS_VISIBLE.includes(item.key);
            return (
              <li key={item.key} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
                <label className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${item.hidden ? "text-muted line-through" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!item.hidden}
                    disabled={locked}
                    aria-label={t.show.replace("{label}", item.label)}
                    onChange={(e) => setDraft(draft.map((d) => (d.key === item.key ? { ...d, hidden: !e.target.checked } : d)))}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  <span className="truncate">{item.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`${t.moveUp}: ${item.label}`}
                  className="rounded px-1.5 text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === draft.length - 1}
                  aria-label={`${t.moveDown}: ${item.label}`}
                  className="rounded px-1.5 text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                >
                  ↓
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ order: draft.map((d) => d.key), hidden: draft.filter((d) => d.hidden).map((d) => d.key) })}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? t.saving : t.save}
          </button>
          <button type="button" disabled={pending} onClick={() => setEditing(false)} className="px-2 text-sm text-muted hover:underline">
            {t.cancel}
          </button>
          <button type="button" disabled={pending} onClick={() => save(null)} className="px-2 text-sm text-muted hover:underline">
            {t.reset}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <nav aria-label={t.mainMenu} className="flex flex-col gap-1">
        {items
          .filter((item) => !item.hidden)
          .map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>
      <button
        type="button"
        onClick={() => {
          setDraft(items);
          setEditing(true);
        }}
        className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground"
      >
        <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        {t.customize}
      </button>
    </div>
  );
}
