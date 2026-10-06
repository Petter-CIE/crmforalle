import "server-only";
import { SITE_URL } from "@/lib/site-url";

// Fiken API v2 with OAuth2 (authorization code). Each customer connects their own Fiken user;
// the company they pick needs Fiken's API add-on, otherwise the API answers 403.
// Environment: FIKEN_CLIENT_ID, FIKEN_CLIENT_SECRET (the app registered in Fiken).

export const FIKEN_API = "https://api.fiken.no/api/v2";
const AUTH = "https://fiken.no/oauth";
export const FIKEN_REDIRECT = `${SITE_URL}/api/integrations/fiken/callback`;

/** What we store (encrypted) in integrations.credentials. */
export type FikenCreds = { access: string; refresh: string; expiresAt: number; slug: string | null };

export type FikenCompany = { slug: string; name: string; organizationNumber?: string; hasApiAccess?: boolean; testCompany?: boolean };

export class FikenError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const fikenEnabled = () => !!process.env.FIKEN_CLIENT_ID && !!process.env.FIKEN_CLIENT_SECRET;

export function fikenAuthorizeUrl(state: string) {
  const q = new URLSearchParams({ response_type: "code", client_id: process.env.FIKEN_CLIENT_ID ?? "", redirect_uri: FIKEN_REDIRECT, state });
  return `${AUTH}/authorize?${q}`;
}

async function token(body: Record<string, string>): Promise<Omit<FikenCreds, "slug">> {
  const basic = Buffer.from(`${process.env.FIKEN_CLIENT_ID}:${process.env.FIKEN_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${AUTH}/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => null)) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string } | null;
  if (!res.ok || !j?.access_token) throw new FikenError(`fiken_token_${j?.error ?? res.status}`, res.status);
  return { access: j.access_token, refresh: j.refresh_token ?? body.refresh_token ?? "", expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
}

export const fikenExchangeCode = (code: string, state: string) =>
  token({ grant_type: "authorization_code", code, redirect_uri: FIKEN_REDIRECT, state });

/** Returns usable credentials, refreshing the access token when it is (nearly) expired. `changed` means they must be saved. */
export async function fikenFresh(c: FikenCreds): Promise<{ creds: FikenCreds; changed: boolean }> {
  if (c.expiresAt - Date.now() > 120_000) return { creds: c, changed: false };
  const t = await token({ grant_type: "refresh_token", refresh_token: c.refresh });
  return { creds: { ...t, slug: c.slug }, changed: true };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fikenGet<T>(access: string, path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${FIKEN_API}${path}${q ? `?${q}` : ""}`, {
    headers: { authorization: `Bearer ${access}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new FikenError(`fiken_${res.status}`, res.status);
  return { data: (await res.json()) as T, pages: Number(res.headers.get("Fiken-Api-Page-Count") ?? "1") };
}

/** Every page of a collection, one request at a time (Fiken allows few requests per second). */
export async function fikenAll<T>(access: string, path: string, params: Record<string, string> = {}, maxPages = 200) {
  const out: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { data, pages } = await fikenGet<T[]>(access, path, { ...params, page: String(page), pageSize: "100" });
    out.push(...data);
    if (page + 1 >= pages || data.length < 100) break;
    await pause(300);
  }
  return out;
}

export async function fikenCompanies(access: string) {
  return fikenAll<FikenCompany>(access, "/companies");
}

/** Best effort: withdraws the app's access (access and refresh token) when a customer disconnects. */
export async function fikenRevoke(access: string) {
  await fetch(`${AUTH}/revoke`, {
    method: "POST",
    headers: { authorization: `Bearer ${access}` },
    cache: "no-store",
  }).catch(() => {});
}
