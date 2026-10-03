"use client";

import { useEffect } from "react";

/** Registers the service worker (installable app, offline page and push notifications). */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // not critical: the site works without it
    });
  }, []);
  return null;
}
