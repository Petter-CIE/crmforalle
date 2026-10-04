"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { saveDashboard } from "@/app/app/actions";
import { WIDGETS, type WidgetId, type WidgetItem } from "@/lib/dashboard";

export type DashTexts = {
  customize: string;
  done: string;
  editHint: string;
  hide: string;
  moveUp: string;
  moveDown: string;
  drag: string;
  wide: string;
  narrow: string;
  resize: string;
  add: string;
  allShown: string;
  reset: string;
  empty: string;
  seeAll: string;
  names: Record<WidgetId, string>;
};

/**
 * The widgets on the "Today" page. In edit mode they can be dragged (mouse and touch) or moved
 * with the arrows, made wide/narrow by dragging their right edge, hidden and added. Saved per user.
 */
export function DashboardGrid({
  layout,
  defaults,
  content,
  links,
  header,
  t,
}: {
  layout: WidgetItem[];
  defaults: WidgetItem[];
  content: Partial<Record<WidgetId, ReactNode>>;
  links: Partial<Record<WidgetId, string>>;
  header: ReactNode;
  t: DashTexts;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(layout);
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  // Width while the user drags the right edge of a widget (px), snapped to narrow/wide on release.
  const [resize, setResize] = useState<{ id: WidgetId; width: number } | null>(null);
  const resizeStart = useRef<{ x: number; width: number; col: number; w: 1 | 2 } | null>(null);
  const [saving, start] = useTransition();
  // Take over a new layout from the server (after saving/reset) unless the user is editing.
  const layoutKey = JSON.stringify(layout);
  const [seen, setSeen] = useState(layoutKey);
  if (seen !== layoutKey) {
    setSeen(layoutKey);
    if (!editing) setItems(layout);
  }

  function persist(next: WidgetItem[] | null, refresh = false) {
    start(async () => {
      await saveDashboard(next);
      if (refresh) router.refresh();
    });
  }
  function update(next: WidgetItem[]) {
    setItems(next);
  }
  function move(id: WidgetId, by: number) {
    const i = items.findIndex((x) => x.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }
  function setWidth(id: WidgetId, w: 1 | 2) {
    setItems((cur) => cur.map((x) => (x.id === id ? { ...x, w } : x)));
  }
  function moveTo(id: WidgetId, target: WidgetId) {
    if (id === target) return;
    setItems((cur) => {
      const from = cur.findIndex((x) => x.id === id);
      const to = cur.findIndex((x) => x.id === target);
      if (from < 0 || to < 0) return cur;
      const next = [...cur];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  const hidden = WIDGETS.filter((id) => !items.some((x) => x.id === id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">{header}</div>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setItems(defaults);
                setEditing(false);
                persist(null, true);
              }}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
            >
              {t.reset}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                persist(items, true);
              }}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              {t.done}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-background"
          >
            <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            {t.customize}
          </button>
        )}
      </div>

      {editing && <p className="rounded-lg border border-dashed border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand">{t.editHint}</p>}

      {items.length === 0 && !editing && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">{t.empty}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((it, i) => {
          const body = content[it.id];
          const href = links[it.id];
          return (
            <section
              key={it.id}
              data-widget={it.id}
              aria-label={t.names[it.id]}
              className={`fade-up relative flex min-w-0 flex-col rounded-xl border bg-surface transition-shadow ${it.w === 2 ? "lg:col-span-2" : ""} ${
                editing ? "border-dashed border-brand/50" : "border-border"
              } ${dragging === it.id ? "opacity-60 shadow-xl ring-2 ring-brand" : ""} ${resize?.id === it.id ? "z-20 shadow-xl ring-2 ring-brand" : ""}`}
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms`, ...(resize?.id === it.id ? { width: resize.width, maxWidth: "none" } : {}) }}
            >
              <header className="flex items-center gap-2 px-5 pt-4">
                {editing && (
                  <button
                    type="button"
                    aria-label={`${t.drag}: ${t.names[it.id]}`}
                    title={t.drag}
                    className="-ml-2 cursor-grab touch-none rounded p-1 text-lg leading-none text-muted hover:bg-background active:cursor-grabbing"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDragging(it.id);
                    }}
                    onPointerMove={(e) => {
                      if (dragging !== it.id) return;
                      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-widget]");
                      const target = el?.dataset.widget as WidgetId | undefined;
                      if (target && target !== it.id) moveTo(it.id, target);
                    }}
                    onPointerUp={() => setDragging(null)}
                    onPointerCancel={() => setDragging(null)}
                  >
                    ⠿
                  </button>
                )}
                <h2 className="min-w-0 flex-1 truncate font-semibold">{t.names[it.id]}</h2>
                {editing ? (
                  <span className="flex items-center gap-0.5 text-xs">
                    <button type="button" onClick={() => move(it.id, -1)} disabled={i === 0} aria-label={t.moveUp} className="rounded px-1.5 py-1 hover:bg-background disabled:opacity-30">
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(it.id, 1)}
                      disabled={i === items.length - 1}
                      aria-label={t.moveDown}
                      className="rounded px-1.5 py-1 hover:bg-background disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => update(items.filter((x) => x.id !== it.id))}
                      className="rounded px-2 py-1 text-danger hover:bg-background"
                    >
                      {t.hide}
                    </button>
                  </span>
                ) : (
                  href && (
                    <Link href={href} className="shrink-0 text-xs text-brand hover:underline">
                      {t.seeAll} →
                    </Link>
                  )
                )}
              </header>
              <div className={`min-w-0 flex-1 px-5 pb-5 pt-3 ${editing ? "pointer-events-none select-none opacity-80" : ""}`}>
                {body ?? <div className="h-24 animate-pulse rounded-lg bg-background" />}
              </div>
              {editing && (
                <button
                  type="button"
                  aria-label={`${t.resize}: ${t.names[it.id]} (${it.w === 2 ? t.wide : t.narrow})`}
                  title={t.resize}
                  className="group absolute -right-2 top-0 bottom-0 hidden w-4 cursor-ew-resize touch-none items-center justify-center lg:flex"
                  onKeyDown={(e) => {
                    // Keyboard: arrows or Enter switch between narrow and wide.
                    const w = e.key === "ArrowRight" ? 2 : e.key === "ArrowLeft" ? 1 : e.key === "Enter" || e.key === " " ? (it.w === 2 ? 1 : 2) : null;
                    if (!w) return;
                    e.preventDefault();
                    setWidth(it.id, w);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const card = e.currentTarget.closest<HTMLElement>("[data-widget]");
                    const grid = card?.parentElement;
                    if (!card || !grid) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const width = card.getBoundingClientRect().width;
                    const col = (grid.getBoundingClientRect().width - 16) / 2;
                    resizeStart.current = { x: e.clientX, width, col, w: it.w };
                    setResize({ id: it.id, width });
                  }}
                  onPointerMove={(e) => {
                    const r = resizeStart.current;
                    if (!r || resize?.id !== it.id) return;
                    const width = Math.max(r.col * 0.6, Math.min(r.width + (e.clientX - r.x), r.col * 2 + 16 + 40));
                    setResize({ id: it.id, width });
                  }}
                  onPointerUp={(e) => {
                    const r = resizeStart.current;
                    resizeStart.current = null;
                    setResize(null);
                    if (!r) return;
                    // Snap: past the middle between one and two columns = wide.
                    const width = r.width + (e.clientX - r.x);
                    setWidth(it.id, width > r.col * 1.5 + 8 ? 2 : 1);
                  }}
                  onPointerCancel={() => {
                    resizeStart.current = null;
                    setResize(null);
                  }}
                >
                  <span
                    aria-hidden
                    className={`h-12 w-1.5 rounded-full transition-colors ${resize?.id === it.id ? "bg-brand" : "bg-brand/40 group-hover:bg-brand group-focus-visible:bg-brand"}`}
                  />
                </button>
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <section className="rounded-xl border border-dashed border-border p-5">
          <h2 className="mb-3 text-sm font-semibold">{t.add}</h2>
          {hidden.length === 0 ? (
            <p className="text-sm text-muted">{t.allShown}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hidden.map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const next = [...items, { id, w: 1 as const }];
                    update(next);
                    // Load the new widget's content right away.
                    if (!content[id]) persist(next, true);
                  }}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
                >
                  + {t.names[id]}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
