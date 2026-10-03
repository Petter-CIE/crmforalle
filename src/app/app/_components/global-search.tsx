"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Hit = { group: "company" | "contact" | "deal" | "quote" | "task"; id: string; label: string; hint: string | null; href: string; done?: boolean };

export type GlobalSearchTexts = {
  placeholder: string;
  label: string;
  empty: string;
  groups: Record<Hit["group"], string>;
};

/** Search field in the menu: finds companies, contacts, deals, quotes and tasks. Shortcut: / or Ctrl/Cmd+K. */
export function GlobalSearch({ t }: { t: GlobalSearchTexts }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  // Keyboard shortcut to focus the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/app/sok?type=all&q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        setHits((await res.json()) as Hit[]);
        setActive(0);
      } catch {
        // aborted or offline
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const shown = q.trim().length >= 2 ? hits : [];
  function go(hit: Hit | undefined) {
    if (!hit) return;
    setOpen(false);
    setQ("");
    setHits([]);
    input.current?.blur();
    router.push(hit.href);
  }

  return (
    <div ref={box} className="relative mb-3" role="search">
      <label htmlFor="global-search" className="sr-only">
        {t.label}
      </label>
      <input
        ref={input}
        id="global-search"
        type="search"
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-controls="global-search-list"
        autoComplete="off"
        value={q}
        placeholder={t.placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20"
      />
      {open && q.trim().length >= 2 && (
        <ul
          id="global-search-list"
          role="listbox"
          className="absolute left-0 z-40 mt-1 max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-surface py-1 text-sm shadow-xl"
        >
          {shown.length === 0 && <li className="px-3 py-2 text-muted">{loading ? "…" : t.empty}</li>}
          {shown.map((h, i) => (
            <li key={`${h.group}-${h.id}`} role="option" aria-selected={i === active}>
              {(i === 0 || shown[i - 1].group !== h.group) && (
                <p className="px-3 pb-0.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">{t.groups[h.group]}</p>
              )}
              <a
                href={h.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(h);
                }}
                onMouseEnter={() => setActive(i)}
                className={`block px-3 py-1.5 ${i === active ? "bg-brand-soft text-brand" : ""}`}
              >
                <span className={`block truncate ${h.done ? "line-through opacity-60" : ""}`}>{h.label}</span>
                {h.hint && <span className="block truncate text-xs text-muted">{h.hint}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
