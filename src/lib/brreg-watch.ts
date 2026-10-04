import "server-only";

// Daily check of customers in Enhetsregisteret (Brønnøysundregistrene): bankruptcy, winding up,
// deletion, new name/address/industry. Uses the public "updates" feed to find what changed.

const BASE = "https://data.brreg.no/enhetsregisteret/api";

export type Snapshot = {
  name: string;
  address: string;
  nace: string;
  form: string;
  konkurs: boolean;
  avvikling: boolean;
  tvang: boolean;
  slettet: string | null;
};
export type WatchItem = { org: string; snapshot: Snapshot; status: string; changes: string[] };

type Raw = {
  navn?: string;
  organisasjonsform?: { kode?: string; beskrivelse?: string };
  forretningsadresse?: { adresse?: string[]; postnummer?: string; poststed?: string };
  postadresse?: { adresse?: string[]; postnummer?: string; poststed?: string };
  naeringskode1?: { kode?: string; beskrivelse?: string };
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  slettedato?: string;
};

function snapshotOf(e: Raw, deleted: boolean): Snapshot {
  const a = e.forretningsadresse ?? e.postadresse;
  return {
    name: e.navn ?? "",
    address: [a?.adresse?.filter(Boolean).join(", "), [a?.postnummer, a?.poststed].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    nace: [e.naeringskode1?.kode, e.naeringskode1?.beskrivelse].filter(Boolean).join(" "),
    form: e.organisasjonsform?.kode ?? "",
    konkurs: !!e.konkurs,
    avvikling: !!e.underAvvikling,
    tvang: !!e.underTvangsavviklingEllerTvangsopplosning,
    slettet: deleted ? (e.slettedato ?? new Date().toISOString().slice(0, 10)) : null,
  };
}

export function statusOf(s: Snapshot) {
  return s.slettet ? "slettet" : s.konkurs ? "konkurs" : s.tvang ? "tvangsavvikling" : s.avvikling ? "avvikling" : "";
}

/** Human-readable changes (Norwegian – these are Norwegian registry events). */
export function describeChanges(before: Snapshot | null, after: Snapshot): string[] {
  if (!before) return [];
  const out: string[] = [];
  const flag = (k: "konkurs" | "avvikling" | "tvang", on: string, off: string) => {
    if (!before[k] && after[k]) out.push(on);
    if (before[k] && !after[k]) out.push(off);
  };
  flag("konkurs", "⚠ Konkurs er registrert.", "Konkursen er opphevet.");
  flag("tvang", "⚠ Selskapet er under tvangsavvikling.", "Tvangsavviklingen er avsluttet.");
  flag("avvikling", "⚠ Selskapet er under avvikling.", "Avviklingen er avsluttet.");
  if (!before.slettet && after.slettet) out.push(`⚠ Slettet fra Enhetsregisteret (${after.slettet}).`);
  if (before.name && after.name && before.name !== after.name) out.push(`Nytt navn: ${before.name} → ${after.name}`);
  if (before.address && after.address && before.address !== after.address) out.push(`Ny forretningsadresse: ${after.address}`);
  if (before.nace && after.nace && before.nace !== after.nace) out.push(`Ny næringskode: ${after.nace}`);
  if (before.form && after.form && before.form !== after.form) out.push(`Ny organisasjonsform: ${before.form} → ${after.form}`);
  return out;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  return res;
}

/** Organisation numbers changed in the registry since `since` (all of them, not only ours). */
export async function changedSince(since: Date): Promise<Set<string>> {
  const out = new Set<string>();
  // The feed returns at most 10 000 per request; continue from the last update id.
  let url = `${BASE}/oppdateringer/enheter?dato=${encodeURIComponent(since.toISOString())}&size=10000`;
  for (let round = 0; round < 20; round++) {
    const res = await fetchJson(url);
    if (!res.ok) throw new Error(`brreg updates ${res.status}`);
    const json = (await res.json()) as { _embedded?: { oppdaterteEnheter?: { organisasjonsnummer: string; oppdateringsid: number }[] } };
    const list = json._embedded?.oppdaterteEnheter ?? [];
    for (const u of list) out.add(u.organisasjonsnummer);
    if (list.length < 10000) break;
    url = `${BASE}/oppdateringer/enheter?oppdateringsid=${list[list.length - 1].oppdateringsid + 1}&size=10000`;
  }
  return out;
}

/** Current data for one organisation number; null when it can't be read right now. */
export async function lookup(org: string): Promise<Snapshot | null> {
  try {
    const res = await fetchJson(`${BASE}/enheter/${org}`);
    if (res.status === 410) return snapshotOf((await res.json().catch(() => ({}))) as Raw, true);
    if (!res.ok) return null;
    return snapshotOf((await res.json()) as Raw, false);
  } catch {
    return null;
  }
}

/** Runs `fn` over the items with a few in parallel, stopping when the time budget is used. */
export async function pool<T, R>(items: T[], size: number, deadline: number, fn: (t: T) => Promise<R>) {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length && Date.now() < deadline) {
        const item = items[i++];
        out.push(await fn(item));
      }
    }),
  );
  return out;
}
