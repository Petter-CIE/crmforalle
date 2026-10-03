"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavTexts = { today: string; sales: string; contacts: string; tasks: string; search: string; mainMenu: string };

const icon = (d: string) => (
  <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/** Tab bar at the bottom of the screen on phones. */
export function BottomNav({ t }: { t: BottomNavTexts }) {
  const pathname = usePathname();
  const items = [
    { href: "/app", label: t.today, d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
    { href: "/app/salg", label: t.sales, d: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z" },
    { href: "/app/kontakter", label: t.contacts, d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
    { href: "/app/oppgaver", label: t.tasks, d: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  ];
  return (
    <nav
      aria-label={t.mainMenu}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-medium text-brand" : "text-muted"}`}
              >
                {icon(it.d)}
                {it.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              const el = document.getElementById("global-search") as HTMLInputElement | null;
              el?.focus();
            }}
            className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] text-muted"
          >
            {icon("M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3")}
            {t.search}
          </button>
        </li>
      </ul>
    </nav>
  );
}
