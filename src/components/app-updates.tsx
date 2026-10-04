"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

const BUILT = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const EVERY_MS = 10 * 60 * 1000;

/**
 * Checks now and then (and when the app comes back to the foreground) whether a newer version
 * has been deployed, and offers to reload. Matters most for the installed app, which can stay
 * open for days.
 */
export function AppUpdates({ t }: { t: { newVersion: string; update: string } }) {
  const toasts = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (BUILT === "dev" || !toasts) return;
    let last = 0;
    const check = async () => {
      if (shown.current || Date.now() - last < 60_000) return;
      last = Date.now();
      try {
        const res = await fetch("/app/versjon", { cache: "no-store" });
        const { version } = (await res.json()) as { version?: string };
        if (version && version !== "dev" && version !== BUILT) {
          shown.current = true;
          toasts.toast(t.newVersion, {
            tone: "info",
            duration: 24 * 60 * 60 * 1000,
            action: { label: t.update, onClick: () => window.location.reload() },
          });
        }
      } catch {
        // offline – try again later
      }
    };
    const onVisible = () => document.visibilityState === "visible" && check();
    const timer = setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [toasts, t.newVersion, t.update]);

  return null;
}
