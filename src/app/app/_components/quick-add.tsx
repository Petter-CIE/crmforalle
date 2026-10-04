"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createQuote } from "@/app/app/tilbud/actions";

export type QuickAddTexts = {
  quickAdd: string;
  close: string;
  quick: { task: string; contact: string; company: string; deal: string; quote: string };
  shortcuts: {
    title: string;
    open: string;
    search: string;
    newMenu: string;
    goToday: string;
    goSales: string;
    goContacts: string;
    goCompanies: string;
    goTasks: string;
    goQuotes: string;
    help: string;
    close: string;
    then: string;
  };
};

const GO: Record<string, string> = {
  i: "/app",
  s: "/app/salg",
  k: "/app/kontakter",
  b: "/app/bedrifter",
  o: "/app/oppgaver",
  t: "/app/tilbud",
};

function typingIn(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

const Icon = ({ d }: { d: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * "+" button on phones (above the tab bar) and keyboard shortcuts on computers:
 * N = add new, G then I/S/K/B/O/T = go to a section, ? = list of shortcuts.
 */
export function QuickAdd({ t }: { t: QuickAddTexts }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const pendingG = useRef<number>(0);

  // Close on navigation.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMenu(false);
      setHelp(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setHelp(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typingIn(e.target)) return;
      const k = e.key.toLowerCase();
      if (pendingG.current && Date.now() - pendingG.current < 1200 && GO[k]) {
        e.preventDefault();
        pendingG.current = 0;
        router.push(GO[k]);
        return;
      }
      pendingG.current = 0;
      if (k === "g") pendingG.current = Date.now();
      else if (k === "n") {
        e.preventDefault();
        setMenu(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const items = [
    { href: "/app/oppgaver#ny-oppgave", label: t.quick.task, d: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    { href: "/app/kontakter/ny", label: t.quick.contact, d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" },
    { href: "/app/bedrifter/ny", label: t.quick.company, d: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" },
    { href: "/app/salg/ny", label: t.quick.deal, d: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  ];
  const hideFab = /\/(ny|rediger)$/.test(pathname);

  return (
    <>
      {!hideFab && (
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label={t.quickAdd}
          aria-expanded={menu}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl font-light leading-none text-white shadow-lg shadow-black/20 transition-transform active:scale-95 md:hidden"
        >
          +
        </button>
      )}

      {menu && (
        <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label={t.quickAdd}>
          <button type="button" aria-label={t.close} onClick={() => setMenu(false)} className="absolute inset-0 bg-black/40" />
          <div className="fade-up absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] mx-auto max-w-sm rounded-2xl border border-border bg-surface p-2 shadow-2xl md:inset-x-0 md:bottom-auto md:top-24">
            <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">{t.quickAdd}</p>
            <ul>
              {items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-background"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Icon d={it.d} />
                    </span>
                    {it.label}
                  </Link>
                </li>
              ))}
              <li>
                <form action={createQuote}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-background">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />
                    </span>
                    {t.quick.quote}
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-[55] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
          <button type="button" aria-label={t.close} onClick={() => setHelp(false)} className="absolute inset-0 bg-black/40" />
          <div className="fade-up relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h2 id="shortcuts-title" className="mb-4 font-semibold">
              {t.shortcuts.title}
            </h2>
            <dl className="space-y-2 text-sm">
              {(
                [
                  [["/"], t.shortcuts.search],
                  [["N"], t.shortcuts.newMenu],
                  [["G", "I"], t.shortcuts.goToday],
                  [["G", "S"], t.shortcuts.goSales],
                  [["G", "K"], t.shortcuts.goContacts],
                  [["G", "B"], t.shortcuts.goCompanies],
                  [["G", "O"], t.shortcuts.goTasks],
                  [["G", "T"], t.shortcuts.goQuotes],
                  [["?"], t.shortcuts.help],
                  [["Esc"], t.shortcuts.close],
                ] as [string[], string][]
              ).map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="flex items-center gap-1 text-xs text-muted">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span>{t.shortcuts.then}</span>}
                        <kbd className="min-w-6 rounded-md border border-border bg-background px-1.5 py-0.5 text-center font-mono text-foreground">{k}</kbd>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

/** Focuses the field named in the URL hash (e.g. /app/oppgaver#ny-oppgave). */
export function HashFocus() {
  const pathname = usePathname();
  useEffect(() => {
    const focus = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.scrollIntoView({ block: "center" });
        el.focus();
      }
    };
    const timer = setTimeout(focus, 80);
    window.addEventListener("hashchange", focus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", focus);
    };
  }, [pathname]);
  return null;
}
