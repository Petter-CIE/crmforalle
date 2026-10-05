"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SearchKind = "company" | "contact" | "deal" | "product";
export type SearchItem = { id: string; label: string; hint?: string | null; data?: Record<string, unknown> };

/**
 * Type-to-search picker backed by /app/sok. Submits the chosen id in a hidden input named `name`.
 * With `onPick` and no `name` it works as a one-shot picker (e.g. "add product").
 */
export function SearchSelect({
  kind,
  name,
  id,
  defaultValue,
  placeholder,
  noneLabel,
  emptyText,
  required,
  exclude,
  onPick,
  clearOnPick = false,
  brreg = false,
  className = "",
}: {
  kind: SearchKind;
  name?: string;
  id?: string;
  defaultValue?: { id: string; label: string } | null;
  placeholder: string;
  /** When set, the user can clear the choice (shown as the first option). */
  noneLabel?: string;
  emptyText: string;
  required?: boolean;
  exclude?: string[];
  onPick?: (item: SearchItem) => void;
  clearOnPick?: boolean;
  /** Companies only: also offer matches from Brønnøysundregistrene (submitted as "brreg:<org nr>"). */
  brreg?: boolean;
  className?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  const listId = `${inputId}-list`;
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(defaultValue ?? null);
  const [query, setQuery] = useState(defaultValue?.label ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const excludeKey = (exclude ?? []).join(",");

  // Fetch matches while the list is open (debounced).
  useEffect(() => {
    if (!open) return;
    const q = selected && query === selected.label ? "" : query;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/app/sok?type=${kind}&q=${encodeURIComponent(q)}${brreg ? "&brreg=1" : ""}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as SearchItem[];
        const skip = new Set(excludeKey ? excludeKey.split(",") : []);
        setItems(data.filter((d) => !skip.has(d.id)));
        setActive(0);
      } catch {
        // aborted or offline – keep the old list
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [open, query, kind, selected, excludeKey, brreg]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, selected]);

  const options: (SearchItem | null)[] = noneLabel && selected ? [null, ...items] : items;

  function choose(item: SearchItem | null) {
    if (item && onPick) onPick(item);
    if (clearOnPick || !item) {
      setSelected(null);
      setQuery("");
    } else {
      setSelected({ id: item.id, label: item.label });
      setQuery(item.label);
    }
    setOpen(false);
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={selected?.id ?? ""} />}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required && !selected}
        value={query}
        placeholder={placeholder}
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selected && e.target.value !== selected.label && name) setSelected(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (options.length > 0) choose(options[active] ?? null);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(selected?.label ?? "");
          }
        }}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full min-w-56 overflow-auto rounded-lg border border-border bg-surface py-1 text-sm shadow-lg"
        >
          {options.length === 0 && <li className="px-3 py-2 text-muted">{loading ? "…" : emptyText}</li>}
          {options.map((o, i) => (
            <li
              key={o?.id ?? "none"}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 ${i === active ? "bg-brand-soft text-brand" : ""}`}
            >
              {o ? (
                <>
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
                </>
              ) : (
                <span className="text-muted">{noneLabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
