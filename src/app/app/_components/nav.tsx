"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavTexts = {
  today: string;
  sales: string;
  companies: string;
  contacts: string;
  tasks: string;
  projects: string;
  settings: string;
  team: string;
  email: string;
  reports: string;
  quotes: string;
  help: string;
  mainMenu: string;
};

export function Nav({ t }: { t: NavTexts }) {
  const pathname = usePathname();
  const items = [
    { href: "/app", label: t.today },
    { href: "/app/salg", label: t.sales },
    { href: "/app/tilbud", label: t.quotes },
    { href: "/app/bedrifter", label: t.companies },
    { href: "/app/kontakter", label: t.contacts },
    { href: "/app/prosjekter", label: t.projects },
    { href: "/app/oppgaver", label: t.tasks },
    { href: "/app/rapporter", label: t.reports },
    { href: "/app/e-post", label: t.email },
    { href: "/app/team", label: t.team },
    { href: "/app/innstillinger", label: t.settings },
    { href: "/faq", label: t.help },
  ];
  return (
    <nav aria-label={t.mainMenu} className="hidden gap-1 md:flex md:flex-col">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
