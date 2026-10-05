/** Filters shared by the company and contact lists, read from the URL (and stored in saved views). */
export const INACTIVE_DAYS = [30, 60, 90, 180, 365] as const;

export type ListFilters = {
  q: string;
  project: string;
  owner: string; // member id, "ingen" (no owner) or ""
  city: string;
  inactive: number; // days, 0 = off
  consent: boolean; // contacts only
  kind: "" | "b2b" | "b2c"; // contacts only
};

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined, max = 100) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(sp: SP): ListFilters {
  const owner = str(sp.ansvarlig);
  const project = str(sp.prosjekt);
  const inactive = Number(str(sp.inaktiv));
  return {
    q: str(sp.q),
    project: UUID.test(project) ? project : "",
    owner: owner === "ingen" || UUID.test(owner) ? owner : "",
    city: str(sp.sted, 60),
    inactive: (INACTIVE_DAYS as readonly number[]).includes(inactive) ? inactive : 0,
    consent: str(sp.samtykke) === "1",
    kind: str(sp.type) === "b2b" ? "b2b" : str(sp.type) === "b2c" ? "b2c" : "",
  };
}

/** The filters as a query string in a fixed order (used to recognise and store views). */
export function filterQuery(f: ListFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.project) p.set("prosjekt", f.project);
  if (f.owner) p.set("ansvarlig", f.owner);
  if (f.city) p.set("sted", f.city);
  if (f.inactive) p.set("inaktiv", String(f.inactive));
  if (f.consent) p.set("samtykke", "1");
  if (f.kind) p.set("type", f.kind);
  return p.toString();
}

/** ISO date `days` ago, for "no activity since". */
export function inactiveSince(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const safeLike = (s: string) => s.replace(/[%,()*"\\]/g, " ");
