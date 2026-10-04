"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/toast";
import { Button, Input, Notice, Select } from "@/components/ui";
import { saveStages, type StageRemoval } from "../customize-actions";

export type EditorStage = {
  key: string;
  id: string | null;
  name: string;
  probability: number;
  kind: "open" | "won" | "lost";
  deals: number;
  hasAutomation: boolean;
};

type Texts = {
  open: string;
  closed: string;
  closedHint: string;
  name: string;
  probability: string;
  add: string;
  newStage: string;
  remove: string;
  undoRemove: string;
  removedNote: string;
  autoWarning: string;
  save: string;
  saving: string;
  drag: string;
  defaultNote: string;
  moveUp: string;
  moveDown: string;
  dealsTemplate: string;
  moveTemplate: string;
};

/** Edit the pipeline: rename, probability, drag to reorder, add and delete open stages. */
export function StageEditor({ pipelineId, initial, t }: { pipelineId: string; initial: EditorStage[]; t: Texts }) {
  const router = useRouter();
  const toasts = useToast();
  const [stages, setStages] = useState(initial);
  // Removed stages (key) → key of the stage that takes over their deals.
  const [removed, setRemoved] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const nextKey = useRef(1);

  const open = stages.filter((s) => s.kind === "open");
  const closed = stages.filter((s) => s.kind !== "open");
  const liveOpen = open.filter((s) => !(s.key in removed));
  const n = (tpl: string, v: number) => tpl.replace("{n}", String(v));

  function patch(key: string, p: Partial<EditorStage>) {
    setStages((cur) => cur.map((s) => (s.key === key ? { ...s, ...p } : s)));
  }
  function moveTo(key: string, target: string) {
    if (key === target) return;
    setStages((cur) => {
      const from = cur.findIndex((s) => s.key === key);
      const to = cur.findIndex((s) => s.key === target);
      if (from < 0 || to < 0 || cur[to].kind !== "open") return cur;
      const next = [...cur];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }
  function step(key: string, by: number) {
    const i = open.findIndex((s) => s.key === key);
    const j = i + by;
    if (j < 0 || j >= open.length) return;
    moveTo(key, open[j].key);
  }
  function remove(s: EditorStage) {
    if (!s.id) {
      setStages((cur) => cur.filter((x) => x.key !== s.key));
      return;
    }
    const other = liveOpen.find((x) => x.key !== s.key);
    setRemoved((r) => ({ ...r, [s.key]: other?.key ?? "" }));
  }

  function save() {
    setError(null);
    const kept = [...open.filter((s) => !(s.key in removed)), ...closed.filter((s) => s.kind === "won"), ...closed.filter((s) => s.kind === "lost")];
    const removals: StageRemoval[] = open
      .filter((s) => s.key in removed && s.id)
      .map((s) => {
        const idx = kept.findIndex((k) => k.key === removed[s.key]);
        return { id: s.id!, moveTo: idx >= 0 ? idx : null };
      });
    start(async () => {
      const res = await saveStages(
        pipelineId,
        kept.map((s) => ({ id: s.id, name: s.name, probability: s.probability, kind: s.kind })),
        removals,
      );
      if (res.error) return setError(res.error);
      setRemoved({});
      toasts?.toast(res.message ?? "OK");
      router.refresh();
    });
  }

  const row = (s: EditorStage, i: number) => {
    const isRemoved = s.key in removed;
    return (
      <li
        key={s.key}
        data-stage={s.kind === "open" ? s.key : undefined}
        className={`rounded-lg border bg-surface p-3 transition-shadow ${dragKey === s.key ? "opacity-60 shadow-lg ring-2 ring-brand" : "border-border"} ${
          isRemoved ? "border-dashed opacity-70" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {s.kind === "open" ? (
            <button
              type="button"
              aria-label={t.drag}
              title={t.drag}
              disabled={isRemoved}
              className="cursor-grab touch-none rounded p-1 text-lg leading-none text-muted hover:bg-background active:cursor-grabbing disabled:opacity-30"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragKey(s.key);
              }}
              onPointerMove={(e) => {
                if (dragKey !== s.key) return;
                const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-stage]");
                if (el?.dataset.stage) moveTo(s.key, el.dataset.stage);
              }}
              onPointerUp={() => setDragKey(null)}
              onPointerCancel={() => setDragKey(null)}
            >
              ⠿
            </button>
          ) : (
            <span aria-hidden className={`grid h-7 w-7 place-items-center rounded-full text-xs ${s.kind === "won" ? "bg-brand-soft text-brand" : "bg-red-50 text-danger"}`}>
              {s.kind === "won" ? "🏆" : "✖"}
            </span>
          )}
          <Input
            value={s.name}
            maxLength={60}
            disabled={isRemoved}
            aria-label={t.name}
            onChange={(e) => patch(s.key, { name: e.target.value })}
            className={`min-w-[10rem] flex-1 ${isRemoved ? "line-through" : ""}`}
          />
          <label className="flex items-center gap-1 text-sm text-muted">
            <Input
              type="number"
              min={0}
              max={100}
              value={s.probability}
              disabled={isRemoved || s.kind !== "open"}
              aria-label={t.probability}
              onChange={(e) => patch(s.key, { probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="!w-20 text-right"
            />
            %
          </label>
          <span className="w-16 text-right text-xs tabular-nums text-muted">{n(t.dealsTemplate, s.deals)}</span>
          {s.kind === "open" && (
            <span className="flex items-center text-xs">
              <button type="button" onClick={() => step(s.key, -1)} disabled={i === 0 || isRemoved} aria-label={t.moveUp} className="rounded px-1.5 py-1 hover:bg-background disabled:opacity-30">
                ↑
              </button>
              <button type="button" onClick={() => step(s.key, 1)} disabled={i === open.length - 1 || isRemoved} aria-label={t.moveDown} className="rounded px-1.5 py-1 hover:bg-background disabled:opacity-30">
                ↓
              </button>
              {isRemoved ? (
                <button
                  type="button"
                  onClick={() =>
                    setRemoved((r) => {
                      const next = { ...r };
                      delete next[s.key];
                      return next;
                    })
                  }
                  className="rounded px-2 py-1 text-brand hover:bg-background"
                >
                  {t.undoRemove}
                </button>
              ) : (
                <button type="button" onClick={() => remove(s)} disabled={liveOpen.length <= 1} className="rounded px-2 py-1 text-danger hover:bg-background disabled:opacity-30">
                  {t.remove}
                </button>
              )}
            </span>
          )}
        </div>
        {isRemoved && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-9 text-xs text-muted">
            <span>{t.removedNote}</span>
            {s.deals > 0 && (
              <label className="flex items-center gap-2">
                {n(t.moveTemplate, s.deals)}
                <Select value={removed[s.key]} onChange={(e) => setRemoved((r) => ({ ...r, [s.key]: e.target.value }))} className="!py-1 text-xs">
                  {[...liveOpen, ...closed].map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.name || "…"}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {s.hasAutomation && <span className="text-amber-700">{t.autoWarning}</span>}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t.open}</h2>
        <ul className="space-y-2">{open.map((s, i) => row(s, i))}</ul>
        <Button
          type="button"
          variant="secondary"
          disabled={open.length >= 20}
          onClick={() => {
            const key = `new-${nextKey.current++}`;
            setStages((cur) => {
              const lastOpen = cur.map((s) => s.kind).lastIndexOf("open");
              const next = [...cur];
              next.splice(lastOpen + 1, 0, { key, id: null, name: t.newStage, probability: 50, kind: "open", deals: 0, hasAutomation: false });
              return next;
            });
          }}
        >
          + {t.add}
        </Button>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t.closed}</h2>
        <p className="text-xs text-muted">{t.closedHint}</p>
        <ul className="space-y-2">{closed.map((s, i) => row(s, i))}</ul>
      </section>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </Button>
        <p className="text-xs text-muted">{t.defaultNote}</p>
      </div>
    </div>
  );
}
