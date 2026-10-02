"use client";

import { useId, useState } from "react";

const SEATS = 40;
const OUR_PRICE = 249;

type Texts = {
  calcTitle: string;
  calcPeople: string; // "{n}" placeholder handled by caller-provided forms
  calcPeopleOne: string;
  calcPerUserLabel: string;
  calcPerUser: string;
  calcOurs: string;
  calcPerMonth: string;
  calcSaving: string; // contains "{amount}"
  calcSame: string;
  calcNote: string;
};

export function SeatCalculator({ t, locale }: { t: Texts; locale: string }) {
  const [people, setPeople] = useState(12);
  const [perUser, setPerUser] = useState(300);
  const sliderId = useId();
  const priceId = useId();
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);

  const theirs = people * perUser;
  const saving = Math.max(0, theirs - OUR_PRICE) * 12;
  const max = Math.max(theirs, OUR_PRICE);

  return (
    <div className="seatmap rounded-[28px] bg-[var(--ink)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(15,59,45,0.6)] sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={sliderId} className="font-display text-lg font-bold sm:text-xl">
          {t.calcTitle}
        </label>
        <output htmlFor={sliderId} className="whitespace-nowrap font-display text-lg font-bold tabular-nums text-[var(--seat-on)] sm:text-xl">
          {(people === 1 ? t.calcPeopleOne : t.calcPeople).replace("{n}", String(people))}
        </output>
      </div>

      {/* the seats: one per person, filled as the team grows */}
      <div className="mt-5 grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: SEATS }, (_, i) => (
          <span key={i} className={`seat ${i < people ? "seat-on" : ""}`} style={{ transitionDelay: `${(i % 10) * 12}ms` }} />
        ))}
      </div>

      <input
        id={sliderId}
        type="range"
        min={1}
        max={SEATS}
        value={people}
        onChange={(e) => setPeople(Number(e.target.value))}
        className="seat-range mt-5 w-full"
      />

      <dl className="mt-6 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-white/70">{t.calcPerUser}</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-[var(--ochre-light)]">
              {money(theirs)}
              <span className="text-xs font-normal text-white/60">{t.calcPerMonth}</span>
            </dd>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="bar h-full rounded-full bg-[var(--ochre)]" style={{ width: `${(theirs / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-white/70">{t.calcOurs}</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-[var(--seat-on)]">
              {money(OUR_PRICE)}
              <span className="text-xs font-normal text-white/60">{t.calcPerMonth}</span>
            </dd>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="bar h-full rounded-full bg-[var(--seat-on)]" style={{ width: `${(OUR_PRICE / max) * 100}%` }} />
          </div>
        </div>
      </dl>

      <p className="mt-5 font-display text-xl font-bold leading-tight sm:text-2xl" aria-live="polite">
        {saving > 0 ? t.calcSaving.replace("{amount}", money(saving)) : t.calcSame}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4 text-xs text-white/60">
        <label htmlFor={priceId}>{t.calcPerUserLabel}</label>
        <span className="inline-flex items-center gap-1">
          <input
            id={priceId}
            type="number"
            min={0}
            max={5000}
            step={10}
            value={perUser}
            onChange={(e) => setPerUser(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
            className="w-20 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-right text-sm text-white tabular-nums focus:border-[var(--seat-on)] focus:outline-none"
          />
          kr
        </span>
        <span className="basis-full">{t.calcNote}</span>
      </div>
    </div>
  );
}
