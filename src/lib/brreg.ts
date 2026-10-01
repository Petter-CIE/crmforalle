// Enhetsregisteret (Brønnøysundregistrene) – open API, no key required.
// https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html

const BASE = "https://data.brreg.no/enhetsregisteret/api";

export type BrregCompany = {
  orgNumber: string;
  name: string;
  orgForm: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  municipality: string | null;
  naceCode: string | null;
  naceDescription: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  bankrupt: boolean;
};

type RawAddress = {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
  kommune?: string;
};

type RawEnhet = {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode?: string };
  forretningsadresse?: RawAddress;
  postadresse?: RawAddress;
  naeringskode1?: { kode?: string; beskrivelse?: string };
  hjemmeside?: string;
  epostadresse?: string;
  telefon?: string;
  mobil?: string;
  konkurs?: boolean;
  underAvvikling?: boolean;
};

function map(e: RawEnhet): BrregCompany {
  const a = e.forretningsadresse ?? e.postadresse;
  return {
    orgNumber: e.organisasjonsnummer,
    name: e.navn,
    orgForm: e.organisasjonsform?.kode ?? null,
    address: a?.adresse?.filter(Boolean).join(", ") || null,
    postalCode: a?.postnummer ?? null,
    city: a?.poststed ?? null,
    municipality: a?.kommune ?? null,
    naceCode: e.naeringskode1?.kode ?? null,
    naceDescription: e.naeringskode1?.beskrivelse ?? null,
    website: e.hjemmeside ?? null,
    email: e.epostadresse ?? null,
    phone: e.telefon ?? e.mobil ?? null,
    bankrupt: Boolean(e.konkurs || e.underAvvikling),
  };
}

export function normalizeOrgNumber(input: string) {
  const digits = input.replace(/\s/g, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

/** Search by name, or look up directly when the query is a 9-digit org number. */
export async function searchBrreg(query: string, size = 8): Promise<BrregCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const orgNumber = normalizeOrgNumber(q);
  if (orgNumber) {
    const res = await fetch(`${BASE}/enheter/${orgNumber}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (res.status === 404 || res.status === 410) return [];
    if (!res.ok) throw new Error(`Brreg ${res.status}`);
    return [map((await res.json()) as RawEnhet)];
  }

  const url = `${BASE}/enheter?navn=${encodeURIComponent(q)}&size=${size}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Brreg ${res.status}`);
  const json = (await res.json()) as { _embedded?: { enheter?: RawEnhet[] } };
  return (json._embedded?.enheter ?? []).map(map);
}
