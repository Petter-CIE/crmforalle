import "server-only";

// Minimal Tripletex API v2 client. Auth: consumer token + employee token -> session token,
// then HTTP Basic with username "0" and the session token as password.
const BASE = process.env.TRIPLETEX_BASE_URL ?? "https://api-test.tripletex.tech/v2";

export type TripletexAuth = { consumerToken: string; employeeToken: string };

function tomorrow() {
  const d = new Date(Date.now() + 36 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function createSession({ consumerToken, employeeToken }: TripletexAuth) {
  const url = new URL(`${BASE}/token/session/:create`);
  url.searchParams.set("consumerToken", consumerToken);
  url.searchParams.set("employeeToken", employeeToken);
  url.searchParams.set("expirationDate", tomorrow());
  const res = await fetch(url, { method: "PUT", cache: "no-store" });
  if (!res.ok) throw new Error(`tripletex_session_${res.status}`);
  const json = (await res.json()) as { value?: { token?: string } };
  if (!json.value?.token) throw new Error("tripletex_session_empty");
  return json.value.token;
}

export async function tripletexGet<T>(session: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`0:${session}`).toString("base64")}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`tripletex_get_${res.status}`);
  return (await res.json()) as T;
}

/** Our own test account, from env (used by the admin connection check). */
export function envAuth(): TripletexAuth | null {
  const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
  const employeeToken = process.env.TRIPLETEX_EMPLOYEE_TOKEN;
  return consumerToken && employeeToken ? { consumerToken, employeeToken } : null;
}

export const TRIPLETEX_BASE = BASE;
