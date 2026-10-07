import "server-only";

// PowerOffice Go API v2. Auth: OAuth 2.0 client credentials – HTTP Basic with
// base64(applicationKey:clientKey) plus the APIM subscription key; the access token lasts 20 minutes.
// The application key and subscription key belong to AllSeats (environment); each customer's
// client key is created when they add AllSeats under Meny → Innstillinger → Utvidelser in Go.
// Environment: POWEROFFICE_APPLICATION_KEY, POWEROFFICE_SUBSCRIPTION_KEY,
// POWEROFFICE_ENV = "demo" (test client) or "production" (default).

const DEMO = process.env.POWEROFFICE_ENV === "demo";
const ROOT = "https://goapi.poweroffice.net";
export const POWEROFFICE_BASE = DEMO ? `${ROOT}/Demo/v2` : `${ROOT}/v2`;
const TOKEN_URL = DEMO ? `${ROOT}/Demo/OAuth/Token` : `${ROOT}/OAuth/Token`;

export class PowerOfficeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const powerOfficeEnabled = () => !!process.env.POWEROFFICE_APPLICATION_KEY && !!process.env.POWEROFFICE_SUBSCRIPTION_KEY;

const subscription = () => process.env.POWEROFFICE_SUBSCRIPTION_KEY ?? "";

/** Exchanges the customer's client key for a 20-minute access token. */
export async function powerOfficeToken(clientKey: string) {
  const basic = Buffer.from(`${process.env.POWEROFFICE_APPLICATION_KEY}:${clientKey}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": subscription(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new PowerOfficeError(`poweroffice_token_${res.status}`, res.status);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new PowerOfficeError("poweroffice_token_empty", 500);
  return json.access_token;
}

async function get(token: string, path: string, params: Record<string, string>) {
  const url = new URL(`${POWEROFFICE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Ocp-Apim-Subscription-Key": subscription(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new PowerOfficeError(`poweroffice_get_${res.status}`, res.status);
  return res;
}

export async function powerOfficeGet<T>(token: string, path: string, params: Record<string, string> = {}) {
  return (await (await get(token, path, params)).json()) as T;
}

const PAGE = 1000;

/** Reads every page of a list endpoint (paging info comes in the X-Pagination header). */
export async function powerOfficeAll<T>(token: string, path: string, params: Record<string, string> = {}) {
  const out: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const res = await get(token, path, { ...params, PageNumber: String(page), PageSize: String(PAGE) });
    const rows = (await res.json()) as T[];
    out.push(...rows);
    let totalPages = 0;
    try {
      totalPages = (JSON.parse(res.headers.get("x-pagination") ?? "{}") as { totalPages?: number }).totalPages ?? 0;
    } catch {
      // no paging header: fall back to the page size
    }
    if (totalPages ? page >= totalPages : rows.length < PAGE) break;
  }
  return out;
}

export type PowerOfficeClient = { ClientId: string; ClientName: string; ValidPrivileges?: string[] };

/** Privileges the sync needs; a client that lacks one gets a clear message instead of a failing sync. */
export const POWEROFFICE_PRIVILEGES = ["Customer", "ContactPerson", "OutgoingInvoice"] as const;

export function missingPrivileges(c: PowerOfficeClient) {
  const valid = c.ValidPrivileges ?? [];
  return POWEROFFICE_PRIVILEGES.filter((p) => !valid.some((v) => v === `${p}_Full` || v === `${p}_Read` || v.startsWith(`${p}_`)));
}
