"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "cfa_last_active";
const WARN_MS = 60_000;
const EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "wheel"] as const;

/** body contains "{s}" for the seconds left. Plain strings only, so the server can pass them. */
export type IdleTexts = { title: string; body: string; stay: string; logout: string };

function readShared() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeShared(ms: number) {
  try {
    localStorage.setItem(KEY, String(ms));
  } catch {
    // private mode etc. – the per-tab timer still works
  }
}

/**
 * Signs the user out after `minutes` without activity. Activity in any tab of the app counts
 * (shared via localStorage). Shows a warning with a countdown one minute before. 0 = off.
 */
export function IdleLogout({ minutes, t }: { minutes: number; t: IdleTexts }) {
  const last = useRef(0);
  const [left, setLeft] = useState<number | null>(null);
  const leaving = useRef(false);
  const limit = minutes * 60_000;

  const logout = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    const back = window.location.pathname + window.location.search;
    try {
      await fetch("/auth/logg-ut", { method: "POST", redirect: "manual" });
    } finally {
      // Full page load on purpose: drops all client-side state of the signed-out session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/logg-inn?utlogget=1&neste=${encodeURIComponent(back)}`;
    }
  }, []);

  const touch = useCallback(() => {
    const now = Date.now();
    // Throttle writes; the check runs every few seconds anyway.
    if (now - last.current < 5_000) return;
    last.current = now;
    writeShared(now);
  }, []);

  useEffect(() => {
    if (minutes <= 0) return;
    last.current = Math.max(Date.now(), readShared());
    writeShared(last.current);

    const check = () => {
      const lastActive = Math.max(last.current, readShared());
      const idle = Date.now() - lastActive;
      if (idle >= limit) {
        void logout();
      } else if (idle >= limit - WARN_MS) {
        setLeft(Math.ceil((limit - idle) / 1000));
      } else {
        setLeft(null);
      }
    };
    const onVisible = () => document.visibilityState === "visible" && check();

    for (const e of EVENTS) window.addEventListener(e, touch, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 1_000);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, touch);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [minutes, limit, touch, logout]);

  if (minutes <= 0 || left === null) return null;

  const stay = () => {
    last.current = 0;
    touch();
    setLeft(null);
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h2 id="idle-title" className="font-semibold">
          {t.title}
        </h2>
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          {t.body.replace("{s}", String(left))}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            autoFocus
            onClick={stay}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {t.stay}
          </button>
          <button type="button" onClick={() => void logout()} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-background">
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
