"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type BottomNavTexts = {
  today: string;
  sales: string;
  contacts: string;
  tasks: string;
  more: string;
  mainMenu: string;
  account: string;
  logout: string;
  close: string;
};
export type MoreLink = { href: string; label: string };

const icon = (d: string) => (
  <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/** Tab bar at the bottom of the screen on phones; "More" opens a sheet with the profile and the other sections. */
export function BottomNav({
  t,
  user,
  more,
}: {
  t: BottomNavTexts;
  user: { name: string; initials: string; email: string; workspace: string };
  more: MoreLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet when navigating, and with Escape.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [
    { href: "/app", label: t.today, d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
    { href: "/app/salg", label: t.sales, d: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z" },
    { href: "/app/kontakter", label: t.contacts, d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
    { href: "/app/oppgaver", label: t.tasks, d: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  ];
  const moreActive = more.some((m) => pathname.startsWith(m.href)) || pathname.startsWith("/app/konto");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t.more}>
          <button type="button" aria-label={t.close} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
            <Link href="/app/konto" className="flex items-center gap-3 rounded-xl p-2 hover:bg-background">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {user.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted">
                  {user.workspace} · {user.email}
                </span>
              </span>
              <span className="text-xs text-brand">{t.account} →</span>
            </Link>
            <ul className="mt-2 grid grid-cols-2 gap-1">
              {more.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className={`block rounded-lg px-3 py-3 text-sm ${pathname.startsWith(m.href) ? "bg-brand-soft font-medium text-brand" : "hover:bg-background"}`}
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
            <form action="/auth/logg-ut" method="post" className="mt-3 border-t border-border pt-3">
              <button type="submit" className="w-full rounded-lg px-3 py-3 text-left text-sm text-danger hover:bg-background">
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      )}
      <nav
        aria-label={t.mainMenu}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map((it) => {
            const active = !open && (it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href));
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
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] ${open || moreActive ? "font-medium text-brand" : "text-muted"}`}
            >
              <span
                aria-hidden
                className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] font-semibold ${open || moreActive ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}
              >
                {user.initials}
              </span>
              {t.more}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
