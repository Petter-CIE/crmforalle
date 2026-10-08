/**
 * The sections of the main menu. Each user can reorder them and hide the ones they don't use
 * (stored in profiles.nav). The bottom bar on phones shows the first four visible ones.
 */
export const NAV_KEYS = [
  "today",
  "sales",
  "quotes",
  "companies",
  "contacts",
  "projects",
  "tasks",
  "reports",
  "email",
  "team",
  "settings",
  "subscription",
  "help",
] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export const NAV_HREF: Record<NavKey, string> = {
  today: "/app",
  sales: "/app/salg",
  quotes: "/app/tilbud",
  companies: "/app/bedrifter",
  contacts: "/app/kontakter",
  projects: "/app/prosjekter",
  tasks: "/app/oppgaver",
  reports: "/app/rapporter",
  email: "/app/e-post",
  team: "/app/team",
  settings: "/app/innstillinger",
  subscription: "/app/abonnement",
  help: "/faq",
};

/** Icon paths (24×24, stroked) for the phone tab bar. */
export const NAV_ICON: Record<NavKey, string> = {
  today: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  sales: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  quotes: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6",
  companies: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20M8 8h3M8 12h3M8 16h3",
  contacts:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  projects: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  tasks: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  reports: "M3 3v18h18M7 15l4-4 3 3 5-6",
  email: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6",
  team: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  subscription: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM2 10h20M6 15h4",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
};

/** Sections only owners and administrators see. */
export const MANAGER_ONLY: NavKey[] = ["subscription"];

/** Settings can't be hidden, so the menu (and the way back to it) can never disappear. */
export const ALWAYS_VISIBLE: NavKey[] = ["settings"];

export type NavPrefs = { order: NavKey[]; hidden: NavKey[] };

const isKey = (v: unknown): v is NavKey => typeof v === "string" && (NAV_KEYS as readonly string[]).includes(v);

/** Reads stored preferences defensively; anything unusable falls back to the default. */
export function parseNavPrefs(raw: unknown): NavPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { order?: unknown; hidden?: unknown };
  const order = Array.isArray(r.order) ? [...new Set(r.order.filter(isKey))] : [];
  const hidden = Array.isArray(r.hidden) ? [...new Set(r.hidden.filter(isKey))].filter((k) => !ALWAYS_VISIBLE.includes(k)) : [];
  if (order.length === 0 && hidden.length === 0) return null;
  return { order, hidden };
}

/**
 * The full menu in the user's order. Sections added after the user saved their order are slotted
 * in after the section that precedes them in the default order.
 */
export function orderedNav(prefs: NavPrefs | null): { key: NavKey; hidden: boolean }[] {
  const order: NavKey[] = prefs?.order.length ? [...prefs.order] : [...NAV_KEYS];
  NAV_KEYS.forEach((key, i) => {
    if (order.includes(key)) return;
    const before = NAV_KEYS.slice(0, i).reverse().find((k) => order.includes(k));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, key);
  });
  const hidden = new Set(prefs?.hidden ?? []);
  return order.map((key) => ({ key, hidden: hidden.has(key) }));
}
