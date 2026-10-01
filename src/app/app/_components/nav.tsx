"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "I dag" },
  { href: "/app/salg", label: "Salg" },
  { href: "/app/bedrifter", label: "Bedrifter" },
  { href: "/app/kontakter", label: "Kontakter" },
  { href: "/app/oppgaver", label: "Oppgaver" },
  { href: "/app/innstillinger", label: "Innstillinger" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Hovedmeny" className="flex gap-1 overflow-x-auto md:flex-col">
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
