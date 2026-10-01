"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BrregCompany } from "@/lib/brreg";
import { Input } from "@/components/ui";

export type BrregTexts = {
  placeholder: string;
  searching: string;
  noHits: string;
  failed: string;
  bankrupt: string;
};

type Props = {
  onSelect: (company: BrregCompany) => void;
  t: BrregTexts;
  autoFocus?: boolean;
};

/** Search-as-you-type against Brønnøysundregistrene (name or org. number). */
export function BrregSearch({ onSelect, t, autoFocus }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrregCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const reqId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/brreg?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { results: BrregCompany[]; error?: string };
        if (id !== reqId.current) return;
        setResults(json.results);
        setError(json.error ?? null);
        setActive(0);
        setOpen(true);
      } catch {
        if (id === reqId.current) setError(t.failed);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, t.failed]);

  const tooShort = query.trim().length < 2;
  const shown = tooShort ? [] : results;
  const shownError = tooShort ? null : error;

  function choose(c: BrregCompany) {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        type="search"
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        value={query}
        placeholder={t.placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => shown.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || shown.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-muted">{t.searching}</span>}
      {shownError && <p className="mt-1 text-xs text-danger">{shownError}</p>}
      {open && shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {shown.map((c, i) => (
            <li
              key={c.orgNumber}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-brand-soft" : ""}`}
            >
              <div className="font-medium">
                {c.name}
                {c.bankrupt && <span className="ml-2 text-xs text-danger">({t.bankrupt})</span>}
              </div>
              <div className="text-xs text-muted">
                {c.orgNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                {c.city ? ` · ${c.city}` : ""}
                {c.naceDescription ? ` · ${c.naceDescription}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && shown.length === 0 && !shownError && (
        <p className="mt-1 text-xs text-muted">{t.noHits}</p>
      )}
    </div>
  );
}
