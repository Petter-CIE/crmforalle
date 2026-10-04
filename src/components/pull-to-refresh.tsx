"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const TRIGGER = 72;

/**
 * Pull down at the top of the page to reload the data. Only in the installed app – browsers
 * have their own. Uses router.refresh(), so what you typed in forms stays.
 */
export function PullToRefresh({ t }: { t: { pull: string; release: string } }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, start] = useTransition();
  const from = useRef<number | null>(null);
  const amount = useRef(0);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    document.documentElement.style.overscrollBehaviorY = "contain";

    const onStart = (e: TouchEvent) => {
      const blocked = e.target instanceof Element && e.target.closest("[role=dialog], textarea, input, select");
      from.current = window.scrollY <= 0 && !blocked ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (from.current === null) return;
      const dy = e.touches[0].clientY - from.current;
      amount.current = dy <= 0 || window.scrollY > 0 ? 0 : Math.min(dy * 0.5, 110);
      setPull(amount.current);
    };
    const onEnd = () => {
      if (from.current === null) return;
      from.current = null;
      if (amount.current >= TRIGGER) start(() => router.refresh());
      amount.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  if (pull === 0 && !refreshing) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-[calc(env(safe-area-inset-top)+0.5rem)]"
      style={{ transform: `translateY(${refreshing ? 8 : pull - 40}px)` }}
    >
      <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-md">
        <span
          aria-hidden
          className={`inline-block h-4 w-4 rounded-full border-2 border-brand border-t-transparent ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
        />
        {refreshing ? "" : ready ? t.release : t.pull}
      </span>
    </div>
  );
}
