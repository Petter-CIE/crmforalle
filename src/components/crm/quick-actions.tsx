"use client";

import type { ReactNode } from "react";

export type QuickActionTexts = { call: string; sms: string; email: string; map: string; web: string; note: string };

function Action({ href, label, icon, onClick, external }: { href: string; label: string; icon: ReactNode; onClick?: () => void; external?: boolean }) {
  return (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs text-muted hover:bg-background hover:text-brand"
    >
      <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      {label}
    </a>
  );
}

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  call: svg("M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"),
  sms: svg("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"),
  email: svg("M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6"),
  map: svg("M12 22s-8-6.5-8-12a8 8 0 0 1 16 0c0 5.5-8 12-8 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"),
  web: svg("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"),
  note: svg("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"),
};

/** One-tap actions for a contact or company: call, SMS, e-mail, map, website and "write a note". */
export function QuickActions({
  phone,
  email,
  address,
  website,
  t,
}: {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  t: QuickActionTexts;
}) {
  const tel = phone?.replace(/[^\d+]/g, "");
  const site = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null;
  return (
    <nav aria-label="Snarveier" className="-mx-2 flex flex-wrap gap-1">
      {tel && <Action href={`tel:${tel}`} label={t.call} icon={ICONS.call} />}
      {tel && <Action href={`sms:${tel}`} label={t.sms} icon={ICONS.sms} />}
      {email && <Action href={`mailto:${email}`} label={t.email} icon={ICONS.email} />}
      {address && <Action href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} label={t.map} icon={ICONS.map} external />}
      {site && <Action href={site} label={t.web} icon={ICONS.web} external />}
      <Action
        href="#notat"
        label={t.note}
        icon={ICONS.note}
        onClick={() => {
          // let the anchor scroll, then put the cursor in the note field
          setTimeout(() => document.getElementById("notat")?.focus(), 50);
        }}
      />
    </nav>
  );
}
