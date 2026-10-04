"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveDeal } from "@/app/app/crm-actions";
import { Avatar } from "@/components/avatar";
import { projectColorHex } from "@/lib/colors";
import { nowMs } from "@/lib/time";

export type BoardStage = { id: string; name: string; probability: number | null; is_won: boolean; is_lost: boolean };
export type BoardDeal = {
  id: string;
  title: string;
  value: number;
  stage_id: string;
  position: number;
  company: string | null;
  contact: string | null;
  projectColor: string | null;
  projectName: string | null;
  expectedClose: string | null;
  stageChangedAt: string;
  updatedAt: string;
  owner: string | null;
};
export type BoardTexts = { today: string; days: string; daysTitle: string; stale: string; weighted: string };

const DAY = 24 * 60 * 60 * 1000;

export function Board({
  stages,
  deals,
  dateLocale,
  emptyText,
  t,
}: {
  stages: BoardStage[];
  deals: BoardDeal[];
  dateLocale: string;
  emptyText: string;
  t: BoardTexts;
}) {
  const now = nowMs();
  const [, startTransition] = useTransition();
  const [optimistic, applyMove] = useOptimistic(deals, (state, m: { id: string; stage_id: string; position: number; at: string }) =>
    state.map((d) => (d.id === m.id ? { ...d, stage_id: m.stage_id, position: m.position, stageChangedAt: m.at, updatedAt: m.at } : d)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const money = (v: number) =>
    new Intl.NumberFormat(dateLocale, { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(v);

  function drop(stageId: string) {
    const id = dragging;
    setDragging(null);
    setOver(null);
    if (!id) return;
    const deal = optimistic.find((d) => d.id === id);
    if (!deal || deal.stage_id === stageId) return;
    const position = nowMs();
    startTransition(async () => {
      applyMove({ id, stage_id: stageId, position, at: new Date(position).toISOString() });
      await moveDeal(id, stageId, position);
    });
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
      <div className="flex min-w-max gap-3">
        {stages.map((s) => {
          const items = optimistic.filter((d) => d.stage_id === s.id).sort((a, b) => b.position - a.position);
          const total = items.reduce((sum, d) => sum + Number(d.value), 0);
          const closed = s.is_won || s.is_lost;
          const weighted = (total * (s.probability ?? 0)) / 100;
          return (
            <section
              key={s.id}
              aria-label={s.name}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                drop(s.id);
              }}
              className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
                over === s.id ? "border-brand bg-brand-soft" : "border-border bg-background"
              } ${closed ? "w-52" : ""}`}
            >
              <header className="mb-2 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-sm font-semibold ${s.is_won ? "text-brand" : s.is_lost ? "text-danger" : ""}`}>{s.name}</h2>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <p className="text-xs tabular-nums text-muted">
                  <span className="font-medium text-foreground">{money(total)}</span>
                  {!closed && s.probability != null && s.probability > 0 && s.probability < 100 && (
                    <span title={`${s.probability} %`}>
                      {" "}
                      · {t.weighted} {money(weighted)}
                    </span>
                  )}
                </p>
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2">
                {items.map((d) => (
                  <li
                    key={d.id}
                    data-del={d.id}
                    draggable
                    onDragStart={(e) => {
                      setDragging(d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={`cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
                      dragging === d.id ? "opacity-50" : ""
                    } ${!closed && now - new Date(d.updatedAt).getTime() > 14 * DAY ? "border-l-4 border-l-amber-500" : ""}`}
                    title={!closed && now - new Date(d.updatedAt).getTime() > 14 * DAY ? t.stale : undefined}
                  >
                    <Link href={`/app/salg/${d.id}`} className="block text-sm font-medium hover:text-brand" draggable={false}>
                      {d.title}
                    </Link>
                    {(d.company || d.contact) && (
                      <p className="mt-0.5 truncate text-xs text-muted">{[d.company, d.contact].filter(Boolean).join(" · ")}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium tabular-nums">{money(Number(d.value))}</span>
                      <span className="flex items-center gap-1.5 text-muted">
                        {!closed && (() => {
                          const days = Math.max(0, Math.floor((now - new Date(d.stageChangedAt).getTime()) / DAY));
                          return (
                            <span
                              title={t.daysTitle.replace("{n}", String(days))}
                              className={`rounded px-1 tabular-nums ${days >= 14 ? "bg-amber-100 text-amber-800" : "bg-background"}`}
                            >
                              ⏱ {days === 0 ? t.today : t.days.replace("{n}", String(days))}
                            </span>
                          );
                        })()}
                        {d.expectedClose && new Date(d.expectedClose).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                        {d.projectColor && (
                          <span
                            title={d.projectName ?? ""}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: projectColorHex(d.projectColor) }}
                          />
                        )}
                        {d.owner && <Avatar name={d.owner} size="xs" title={d.owner} />}
                      </span>
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="px-1 py-4 text-center text-xs text-muted/70">{emptyText}</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
