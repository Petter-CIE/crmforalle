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

// ---------------------------------------------------------------- roles and key figures
// Roles: https://data.brreg.no/enhetsregisteret/api/enheter/{orgnr}/roller
// Accounts: https://data.brreg.no/regnskapsregisteret/regnskap/{orgnr} (latest filed year, free)

export type BrregRole = { code: string; title: string; firstName: string; lastName: string; isCompany: boolean };
export type BrregFigures = {
  year: number;
  currency: string;
  revenue: number | null;
  operatingResult: number | null;
  netResult: number | null;
  equity: number | null;
};
export type BrregDetails = {
  employees: number | null;
  founded: string | null;
  roles: BrregRole[];
  figures: BrregFigures | null;
};

/** Roles shown on a company, in this order. Birth dates from the register are never kept. */
const ROLE_ORDER = ["DAGL", "LEDE", "NEST", "KONT", "INNH", "DTPR", "DTSO", "MEDL", "REVI", "REGN"];

type RawRole = {
  avregistrert?: boolean;
  person?: { erDoed?: boolean; navn?: { fornavn?: string; mellomnavn?: string; etternavn?: string } };
  enhet?: { navn?: string[] | string; organisasjonsnummer?: string };
  type?: { kode?: string; beskrivelse?: string };
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function brregDetails(orgNumber: string): Promise<BrregDetails | null> {
  const org = normalizeOrgNumber(orgNumber);
  if (!org) return null;
  const [enhet, roller, regnskap] = await Promise.all([
    getJson<{ antallAnsatte?: number; harRegistrertAntallAnsatte?: boolean; stiftelsesdato?: string }>(`${BASE}/enheter/${org}`),
    getJson<{ rollegrupper?: { roller?: RawRole[] }[] }>(`${BASE}/enheter/${org}/roller`),
    getJson<
      {
        regnskapsperiode?: { tilDato?: string };
        valuta?: string;
        egenkapitalGjeld?: { egenkapital?: { sumEgenkapital?: number } };
        resultatregnskapResultat?: {
          aarsresultat?: number;
          driftsresultat?: { driftsresultat?: number; driftsinntekter?: { sumDriftsinntekter?: number } };
        };
      }[]
    >(`https://data.brreg.no/regnskapsregisteret/regnskap/${org}`),
  ]);
  if (!enhet && !roller && !regnskap) return null;

  const roles: BrregRole[] = [];
  for (const g of roller?.rollegrupper ?? []) {
    for (const r of g.roller ?? []) {
      const code = r.type?.kode ?? "";
      if (r.avregistrert || r.person?.erDoed || !ROLE_ORDER.includes(code)) continue;
      const n = r.person?.navn;
      const companyName = Array.isArray(r.enhet?.navn) ? r.enhet?.navn.join(" ") : r.enhet?.navn;
      roles.push({
        code,
        title: r.type?.beskrivelse ?? code,
        firstName: n ? [n.fornavn, n.mellomnavn].filter(Boolean).join(" ") : (companyName ?? ""),
        lastName: n?.etternavn ?? "",
        isCompany: !n,
      });
    }
  }
  roles.sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code));

  const latest = [...(regnskap ?? [])].sort((a, b) => (b.regnskapsperiode?.tilDato ?? "").localeCompare(a.regnskapsperiode?.tilDato ?? ""))[0];
  const figures: BrregFigures | null = latest
    ? {
        year: Number((latest.regnskapsperiode?.tilDato ?? "").slice(0, 4)) || 0,
        currency: latest.valuta || "NOK",
        revenue: latest.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter ?? null,
        operatingResult: latest.resultatregnskapResultat?.driftsresultat?.driftsresultat ?? null,
        netResult: latest.resultatregnskapResultat?.aarsresultat ?? null,
        equity: latest.egenkapitalGjeld?.egenkapital?.sumEgenkapital ?? null,
      }
    : null;

  return {
    employees: enhet?.harRegistrertAntallAnsatte === false ? null : (enhet?.antallAnsatte ?? null),
    founded: enhet?.stiftelsesdato ?? null,
    roles: roles.slice(0, 12),
    figures,
  };
}
