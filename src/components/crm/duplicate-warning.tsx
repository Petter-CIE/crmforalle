"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Hit = { id: string; label: string; hint: string | null; href: string };

const FIELDS = {
  company: { name: "name", org: "org_number" },
  contact: { first: "first_name", last: "last_name", email: "email", phone: "phone" },
} as const;

/**
 * Watches the surrounding form and warns when a company/contact with the same org. number,
 * name, e-mail or phone already exists. Polls the fields, so values filled in by the
 * Brønnøysund search are noticed too.
 */
export function DuplicateWarning({ kind, excludeId, t }: { kind: "company" | "contact"; excludeId?: string; t: { label: string; open: string } }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const last = useRef("");

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    let ctrl: AbortController | null = null;
    const tick = async () => {
      const fd = new FormData(form);
      const params = new URLSearchParams({ type: `dup-${kind}` });
      for (const [k, field] of Object.entries(FIELDS[kind])) params.set(k, String(fd.get(field) ?? "").trim());
      if (excludeId) params.set("exclude", excludeId);
      const key = params.toString();
      if (key === last.current) return;
      last.current = key;
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const res = await fetch(`/app/sok?${key}`, { signal: ctrl.signal });
        setHits(res.ok ? ((await res.json()) as Hit[]) : []);
      } catch {
        // aborted / offline
      }
    };
    const timer = setInterval(tick, 800);
    return () => {
      clearInterval(timer);
      ctrl?.abort();
    };
  }, [kind, excludeId]);

  return (
    <div ref={anchor}>
      {hits.length > 0 && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">⚠ {t.label}</p>
          <ul className="mt-1 space-y-0.5">
            {hits.map((h) => (
              <li key={h.id}>
                <Link href={h.href} target="_blank" className="font-medium underline">
                  {h.label}
                </Link>
                {h.hint && <span className="text-amber-800"> · {h.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
