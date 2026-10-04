import "server-only";

// Microsoft 365 / Outlook through Microsoft Graph, per user (delegated, read only).
// Needs an app registration in Microsoft Entra ID: MS_CLIENT_ID and MS_CLIENT_SECRET in the
// environment, redirect URI <site>/app/konto/microsoft/callback, delegated permissions
// offline_access, User.Read, Mail.Read and Calendars.Read.

const AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
export const MS_SCOPES = "offline_access openid email User.Read Mail.Read Calendars.Read";

export const microsoftEnabled = () => !!process.env.MS_CLIENT_ID && !!process.env.MS_CLIENT_SECRET;

export function authorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MS_SCOPES,
    state,
    prompt: "select_account",
  });
  return `${AUTH}/authorize?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; error?: string; error_description?: string };

async function token(body: Record<string, string>) {
  const res = await fetch(`${AUTH}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID ?? "", client_secret: process.env.MS_CLIENT_SECRET ?? "", ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) throw new Error(json.error_description?.split("\n")[0] || json.error || `token ${res.status}`);
  return json;
}

export const exchangeCode = (code: string, redirectUri: string) =>
  token({ grant_type: "authorization_code", code, redirect_uri: redirectUri, scope: MS_SCOPES });

export const refreshAccess = (refreshToken: string) => token({ grant_type: "refresh_token", refresh_token: refreshToken, scope: MS_SCOPES });

async function graph<T>(accessToken: string, path: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${GRAPH}${path}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json", ...headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(j?.error?.message || `graph ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function me(accessToken: string) {
  const u = await graph<{ mail?: string | null; userPrincipalName?: string }>(accessToken, "/me?$select=mail,userPrincipalName");
  return (u.mail || u.userPrincipalName || "").toLowerCase();
}

type Address = { emailAddress?: { address?: string; name?: string } };
type GraphMessage = {
  internetMessageId?: string;
  id: string;
  subject?: string;
  from?: Address;
  toRecipients?: Address[];
  ccRecipients?: Address[];
  receivedDateTime?: string;
  sentDateTime?: string;
  body?: { content?: string };
  isDraft?: boolean;
};
export type SyncedMessage = { id: string; from: string; from_name: string | null; to: string[]; cc: string[]; subject: string; body: string; sent_at: string };

const addr = (a?: Address) => (a?.emailAddress?.address ?? "").toLowerCase();

/** Messages in a folder (inbox or sentitems) since the given time, oldest first, up to `max`. */
export async function messagesSince(accessToken: string, folder: "inbox" | "sentitems", since: string, max = 200): Promise<SyncedMessage[]> {
  const field = folder === "inbox" ? "receivedDateTime" : "sentDateTime";
  const q = new URLSearchParams({
    $filter: `${field} ge ${new Date(since).toISOString()}`,
    $orderby: `${field} asc`,
    $select: "id,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,isDraft",
    $top: "50",
  });
  let url: string | undefined = `/me/mailFolders/${folder}/messages?${q}`;
  const out: SyncedMessage[] = [];
  while (url && out.length < max) {
    const page: { value: GraphMessage[]; "@odata.nextLink"?: string } = await graph(accessToken, url, { prefer: 'outlook.body-content-type="text"' });
    for (const m of page.value) {
      if (m.isDraft) continue;
      out.push({
        id: m.internetMessageId || m.id,
        from: addr(m.from),
        from_name: m.from?.emailAddress?.name ?? null,
        to: (m.toRecipients ?? []).map(addr).filter(Boolean),
        cc: (m.ccRecipients ?? []).map(addr).filter(Boolean),
        subject: m.subject ?? "",
        body: (m.body?.content ?? "").replace(/\r\n/g, "\n").slice(0, 20000),
        sent_at: (folder === "inbox" ? m.receivedDateTime : m.sentDateTime) ?? new Date().toISOString(),
      });
    }
    url = page["@odata.nextLink"];
  }
  return out;
}

/** Busy times (start, end in UTC) in the calendar for the coming days. Free and cancelled events are left out. */
export async function busyTimes(accessToken: string, days = 60): Promise<[string, string][]> {
  const start = new Date();
  const end = new Date(start.getTime() + days * 86_400_000);
  const q = new URLSearchParams({ startDateTime: start.toISOString(), endDateTime: end.toISOString(), $select: "start,end,showAs,isCancelled", $top: "200" });
  let url: string | undefined = `/me/calendarView?${q}`;
  const out: [string, string][] = [];
  type Ev = { start: { dateTime: string }; end: { dateTime: string }; showAs?: string; isCancelled?: boolean };
  while (url && out.length < 2000) {
    const page: { value: Ev[]; "@odata.nextLink"?: string } = await graph(accessToken, url, { prefer: 'outlook.timezone="UTC"' });
    for (const e of page.value) {
      if (e.isCancelled || e.showAs === "free" || e.showAs === "workingElsewhere") continue;
      out.push([`${e.start.dateTime.replace(/Z?$/, "")}Z`, `${e.end.dateTime.replace(/Z?$/, "")}Z`]);
    }
    url = page["@odata.nextLink"];
  }
  return out;
}
