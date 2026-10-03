import "server-only";
import { createECDH, createHmac } from "node:crypto";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * VAPID keys for web push, derived from INTEGRATION_SECRET so nothing extra has to be configured.
 * Changing INTEGRATION_SECRET means every device has to turn notifications on again.
 */
function vapid() {
  const secret = process.env.INTEGRATION_SECRET;
  if (!secret || secret.length < 24) return null;
  const priv = createHmac("sha256", secret).update("allseats-vapid-v1").digest();
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  return { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: priv.toString("base64url") };
}

export function vapidPublicKey() {
  return vapid()?.publicKey ?? null;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string | null };
type Sub = { endpoint: string; p256dh: string; auth: string };

/** Sends one batch claimed from the outbox. Returns endpoints the push service says are gone. */
export async function sendPushBatch(batch: (PushMessage & { subs: Sub[] })[]) {
  const keys = vapid();
  if (!keys) return { sent: 0, gone: [] as string[] };
  webpush.setVapidDetails("mailto:post@allseats.no", keys.publicKey, keys.privateKey);
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    batch.flatMap((m) =>
      m.subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag ?? undefined }),
            { TTL: 60 * 60 * 24, urgency: "normal" },
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) gone.push(s.endpoint);
          else console.error("push failed", code ?? (e instanceof Error ? e.message : e));
        }
      }),
    ),
  );
  return { sent, gone };
}

/** Queues a push to colleagues (the database only accepts people who share a company with the caller). Never throws. */
export async function queuePush(supabase: SupabaseClient<Database>, users: (string | null | undefined)[], m: PushMessage) {
  try {
    const ids = [...new Set(users.filter((u): u is string => !!u))];
    if (ids.length === 0) return;
    await supabase.rpc("queue_push", { p_users: ids, p_title: m.title, p_body: m.body, p_url: m.url, p_tag: m.tag ?? null });
  } catch (e) {
    console.error("queuePush failed", e instanceof Error ? e.message : e);
  }
}
