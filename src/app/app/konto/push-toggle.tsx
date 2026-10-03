"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

export type PushTexts = {
  pushOn: string;
  pushOff: string;
  pushEnabled: string;
  pushDenied: string;
  pushUnsupported: string;
  pushTest: string;
  pushTestSent: string;
  pushFailed: string;
};

function keyBytes(base64url: string) {
  const s = atob(base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Turns push notifications on or off for this device. */
export function PushToggle({ publicKey, t }: { publicKey: string | null; t: PushTexts }) {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState("unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }, 0);
    return () => clearTimeout(timer);
  }, [publicKey]);

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
      const res = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (!res.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setNote(t.pushFailed);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setNote(t.pushFailed);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-sm text-muted">{t.pushUnsupported}</p>;
  if (state === "denied") return <p className="text-sm text-amber-700">{t.pushDenied}</p>;

  const button = "rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <div className="space-y-2">
      {state === "on" && <p className="text-sm text-brand">✓ {t.pushEnabled}</p>}
      <div className="flex flex-wrap gap-2">
        {state === "off" ? (
          <button type="button" onClick={turnOn} disabled={busy} className={`${button} bg-brand text-white hover:bg-brand-hover`}>
            {t.pushOn}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setNote(null);
                const res = await sendTestPush();
                setNote(res.ok ? t.pushTestSent : t.pushFailed);
              }}
              className={`${button} border border-border bg-surface hover:bg-background`}
            >
              {t.pushTest}
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className={`${button} text-muted hover:bg-background`}>
              {t.pushOff}
            </button>
          </>
        )}
      </div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
