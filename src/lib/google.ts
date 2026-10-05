import "server-only";

// Google Calendar, per user: only free/busy times, used to keep the booking page free of meetings.
// Needs an OAuth client (type "Web application") in Google Cloud: GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET in the environment, redirect URI <site>/app/konto/google/callback, and the
// scope calendar.freebusy on the consent screen. Gmail is not read – e-mail comes in through
// forwarding to the company's CRM address instead (no restricted scopes, no security audit).

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
export const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar.freebusy";

export const googleEnabled = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export function authorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: GOOGLE_SCOPES,
    state,
    access_type: "offline",
    // Always ask, so Google sends a refresh token also when the user connected before.
    prompt: "consent select_account",
    include_granted_scopes: "true",
  });
  return `${AUTH}?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; id_token?: string; expires_in: number; error?: string; error_description?: string };

async function token(body: Record<string, string>) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || `token ${res.status}`);
  return json;
}

export const exchangeCode = (code: string, redirectUri: string) => token({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

export const refreshAccess = (refreshToken: string) => token({ grant_type: "refresh_token", refresh_token: refreshToken });

/** The e-mail address of the Google account, from the ID token we just received over TLS from Google. */
export function emailFromIdToken(idToken?: string) {
  if (!idToken) return "";
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { email?: string; email_verified?: boolean };
    return payload.email && payload.email_verified !== false ? payload.email.toLowerCase() : "";
  } catch {
    return "";
  }
}

/** Busy times (start, end in UTC) in the user's primary calendar for the coming days. */
export async function busyTimes(accessToken: string, days = 60): Promise<[string, string][]> {
  const start = new Date();
  const end = new Date(start.getTime() + days * 86_400_000);
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: start.toISOString(), timeMax: end.toISOString(), items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  type FreeBusy = {
    calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason?: string }[] }>;
    error?: { message?: string };
  };
  const json = (await res.json().catch(() => ({}))) as FreeBusy;
  if (!res.ok) throw new Error(json.error?.message || `freeBusy ${res.status}`);
  const cal = json.calendars?.primary;
  if (cal?.errors?.length) throw new Error(cal.errors[0].reason || "calendar error");
  return (cal?.busy ?? []).slice(0, 2000).map((b) => [new Date(b.start).toISOString(), new Date(b.end).toISOString()]);
}
