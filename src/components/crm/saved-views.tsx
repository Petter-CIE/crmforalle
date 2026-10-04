"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteView, saveView } from "@/app/app/views-actions";
import { useToast } from "@/components/toast";

export type View = { id: string; name: string; query: string; shared: boolean; mine: boolean };
type Texts = { title: string; all: string; save: string; namePlaceholder: string; shared: string; saveBtn: string; remove: string; sharedBadge: string };

/** Row of saved views above a list, with "Save view" for the current filters. */
export function SavedViews({ entity, base, current, views, t }: { entity: "companies" | "contacts"; base: string; current: string; views: View[]; t: Texts }) {
  const router = useRouter();
  const toasts = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, start] = useTransition();
  const pill = (on: boolean) => `inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${on ? "border-brand bg-brand-soft font-medium text-brand" : "border-border bg-surface hover:border-brand"}`;

  return (
    <div className="space-y-2" aria-label={t.title}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={base} className={pill(!current)}>
          {t.all}
        </Link>
        {views.map((v) => (
          <span key={v.id} className={pill(v.query === current)}>
            <Link href={`${base}?${v.query}`}>{v.name}</Link>
            {v.shared && <span className="text-[10px] uppercase tracking-wide text-muted">· {t.sharedBadge}</span>}
            {v.mine && (
              <button
                type="button"
                aria-label={`${t.remove}: ${v.name}`}
                title={t.remove}
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    await deleteView(v.id, entity);
                    router.refresh();
                  })
                }
                className="ml-0.5 text-muted hover:text-danger"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {current && !views.some((v) => v.query === current) && !open && (
          <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-dashed border-brand px-3 py-1 text-sm text-brand hover:bg-brand-soft">
            + {t.save}
          </button>
        )}
      </div>
      {open && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveView(entity, name, current, shared);
              if (res.ok) {
                toasts?.toast(res.message ?? "OK");
                setOpen(false);
                setName("");
                router.refresh();
              } else if (res.error) toasts?.toast(res.error, { tone: "error" });
            });
          }}
        >
          <input
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            aria-label={t.save}
            className="min-w-[14rem] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            {t.shared}
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
            {t.saveBtn}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-muted">
            ×
          </button>
        </form>
      )}
    </div>
  );
}
