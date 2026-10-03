"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export type InstallTexts = {
  title: string;
  intro: string;
  install: string;
  installed: string;
  iosSteps: string; // "1) … 2) …" lines separated by \n
  otherBrowsers: string;
  dismiss: string;
};

const DISMISS_KEY = "cfa_install_dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Explains how to put AllSeats on the home screen. `banner` = small dismissible card for phones;
 * otherwise a full section (account page).
 */
export function InstallApp({ t, banner = false }: { t: InstallTexts; banner?: boolean }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<"unknown" | "installed" | "ios" | "prompt" | "other">("unknown");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const decide = () => {
      if (isStandalone()) return setState("installed");
      if (isIos()) return setState("ios");
      setState((s) => (s === "prompt" ? s : "other"));
    };
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setState("prompt");
    };
    const onInstalled = () => setState("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Read browser-only state after the first render, so server and client HTML match.
    const timer = setTimeout(() => {
      decide();
      try {
        if (banner && localStorage.getItem(DISMISS_KEY)) setHidden(true);
      } catch {
        // storage blocked – show the banner
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [banner]);

  if (state === "unknown") return null;
  if (banner && (hidden || state === "installed" || state === "other")) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const body =
    state === "installed" ? (
      <p className="text-sm text-brand">✓ {t.installed}</p>
    ) : state === "prompt" ? (
      <button
        type="button"
        onClick={async () => {
          if (!prompt) return;
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === "accepted") setState("installed");
          setPrompt(null);
        }}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        {t.install}
      </button>
    ) : state === "ios" ? (
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {t.iosSteps.split("\n").map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    ) : (
      <p className="text-sm text-muted">{t.otherBrowsers}</p>
    );

  if (banner) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-brand-soft p-4 md:hidden">
        <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">{t.title}</p>
          {body}
        </div>
        <button type="button" onClick={dismiss} aria-label={t.dismiss} className="px-1 text-lg leading-none text-muted">
          ×
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t.intro}</p>
      {body}
    </div>
  );
}
