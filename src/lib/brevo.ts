import "server-only";
import { createHash } from "node:crypto";

// Campaign e-mail through Brevo's transactional API (kept apart from the One.com SMTP used for
// login links and notifications, so newsletter complaints can never block those).
// Environment: BREVO_API_KEY, BREVO_SENDER (a sender verified in Brevo, default kampanje@allseats.no)
// and BREVO_DAILY_LIMIT (the account's daily limit; the free plan allows 300).

export const brevoEnabled = () => !!process.env.BREVO_API_KEY;
export const brevoSender = () => process.env.BREVO_SENDER || "kampanje@allseats.no";
export const brevoDailyLimit = () => Math.max(0, Number(process.env.BREVO_DAILY_LIMIT) || 280);

export type BrevoMail = {
  to: string;
  toName?: string | null;
  fromName: string;
  replyTo?: { email: string; name?: string | null } | null;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
  tag?: string;
};

export async function sendBrevo(m: BrevoMail) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: brevoSender(), name: m.fromName.replace(/["<>]/g, "").slice(0, 70) },
      to: [{ email: m.to, ...(m.toName ? { name: m.toName.replace(/["<>]/g, "").slice(0, 70) } : {}) }],
      ...(m.replyTo?.email ? { replyTo: { email: m.replyTo.email, ...(m.replyTo.name ? { name: m.replyTo.name.slice(0, 70) } : {}) } } : {}),
      subject: m.subject,
      htmlContent: m.html,
      textContent: m.text,
      ...(m.unsubscribeUrl
        ? { headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        : {}),
      ...(m.tag ? { tags: [m.tag] } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
    throw new Error(j?.message || j?.code || `brevo ${res.status}`);
  }
}

// ---- Receiving: Brevo parses mail sent to the inbound subdomain and posts it to our webhook.

/** Secret for the webhook URL, derived from the API key so no extra setting is needed. Changing the key means registering the webhook again. */
export function inboundSecret() {
  const key = process.env.BREVO_API_KEY;
  return key ? createHash("sha256").update(`allseats-inbound:${key}`).digest("hex").slice(0, 40) : null;
}

class BrevoError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type BrevoWebhook = { id: number; url: string; type?: string; domain?: string; events?: string[]; description?: string };

async function brevoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", "content-type": "application/json", accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
    throw new BrevoError(j?.message || j?.code || `brevo ${res.status}`, res.status);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export async function listInboundWebhooks() {
  try {
    const r = await brevoApi<{ webhooks?: BrevoWebhook[] }>("/webhooks?type=inbound");
    return r.webhooks ?? [];
  } catch (e) {
    // Brevo answers 404 "Webhook record does not exist" instead of an empty list.
    if (e instanceof BrevoError && e.status === 404) return [];
    throw e;
  }
}

export function createInboundWebhook(url: string, domain: string) {
  return brevoApi<{ id: number }>("/webhooks", {
    method: "POST",
    body: JSON.stringify({ type: "inbound", events: ["inboundEmailProcessed"], url, domain, description: "AllSeats CRM – e-post til CRM-adressene" }),
  });
}

export function deleteWebhook(id: number) {
  return brevoApi<null>(`/webhooks/${id}`, { method: "DELETE" });
}
