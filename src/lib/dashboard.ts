/** Widgets on the "Today" page. Each user chooses which ones to show, their order and width. */
export const WIDGETS = ["kpis", "tasks", "upcoming", "won", "pipeline", "stale", "quotes", "activity", "quick", "start"] as const;
export type WidgetId = (typeof WIDGETS)[number];
export type WidgetItem = { id: WidgetId; w: 1 | 2 };

export function defaultLayout(showStart: boolean): WidgetItem[] {
  return [
    ...(showStart ? [{ id: "start", w: 2 } as const] : []),
    { id: "kpis", w: 2 },
    { id: "tasks", w: 1 },
    { id: "quotes", w: 1 },
    { id: "won", w: 1 },
    { id: "activity", w: 1 },
    { id: "stale", w: 1 },
    { id: "pipeline", w: 1 },
  ];
}

/** Validates a stored or submitted layout; null when it is not usable. */
export function parseLayout(value: unknown): WidgetItem[] | null {
  const items = value && typeof value === "object" && "items" in value ? (value as { items: unknown }).items : value;
  if (!Array.isArray(items)) return null;
  const seen = new Set<string>();
  const out: WidgetItem[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const { id, w } = it as { id?: unknown; w?: unknown };
    if (typeof id !== "string" || !(WIDGETS as readonly string[]).includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id: id as WidgetId, w: w === 2 ? 2 : 1 });
  }
  return out;
}
