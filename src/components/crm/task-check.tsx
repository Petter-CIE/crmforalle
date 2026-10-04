"use client";

import { useOptimistic, useRef, useTransition, type ReactNode } from "react";
import { toggleTask } from "@/app/app/crm-actions";
import { useToast } from "@/components/toast";

type Texts = { markDone: string; reopen: string; done: string; reopened: string; undo: string };

function submit(id: string, done: boolean, path: string) {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("done", done ? "true" : "false");
  fd.set("tilbake", path);
  return toggleTask(fd);
}

/** Round "done" checkbox for a task. Ticks at once, shows a toast with Undo. */
export function TaskCheck({ id, done, path, t }: { id: string; done: boolean; path: string; t: Texts }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();
  const toasts = useToast();

  function set(next: boolean, notify: boolean) {
    start(async () => {
      setOptimistic(next);
      await submit(id, next, path);
    });
    if (notify && toasts) {
      toasts.toast(next ? t.done : t.reopened, {
        action: { label: t.undo, onClick: () => set(!next, false) },
      });
    }
  }

  return (
    <button
      type="button"
      data-task-check
      onClick={() => set(!optimistic, true)}
      aria-label={optimistic ? t.reopen : t.markDone}
      aria-pressed={optimistic}
      className={`row-above mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition-colors ${
        optimistic ? "border-brand bg-brand text-white" : "border-border hover:border-brand hover:bg-brand-soft"
      }`}
    >
      {optimistic ? "✓" : ""}
    </button>
  );
}

/**
 * List row that can be swiped right on touch screens to tick the task off (presses its TaskCheck).
 */
export function SwipeRow({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  const start = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const THRESHOLD = 90;

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 180ms ease";
    el.style.transform = "";
    el.style.backgroundImage = "";
  }

  return (
    <li
      ref={ref}
      data-del={id}
      className={className}
      onTouchStart={(e) => {
        const p = e.touches[0];
        start.current = { x: p.clientX, y: p.clientY, active: false };
      }}
      onTouchMove={(e) => {
        const s = start.current;
        const el = ref.current;
        if (!s || !el) return;
        const dx = e.touches[0].clientX - s.x;
        const dy = e.touches[0].clientY - s.y;
        if (!s.active) {
          // Only a clearly horizontal swipe to the right counts; otherwise let the page scroll.
          if (Math.abs(dy) > 10) {
            start.current = null;
            return;
          }
          if (dx < 12) return;
          s.active = true;
        }
        const x = Math.max(0, Math.min(dx, 140));
        el.style.transition = "none";
        el.style.transform = `translateX(${x}px)`;
        el.style.backgroundImage =
          x >= THRESHOLD ? "linear-gradient(90deg, var(--brand-soft), transparent)" : "linear-gradient(90deg, var(--background), transparent)";
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        start.current = null;
        if (!s?.active) return;
        const dx = e.changedTouches[0].clientX - s.x;
        reset();
        if (dx >= THRESHOLD) {
          ref.current?.querySelector<HTMLButtonElement>("[data-task-check]")?.click();
          if ("vibrate" in navigator) navigator.vibrate?.(10);
        }
      }}
      onTouchCancel={() => {
        start.current = null;
        reset();
      }}
    >
      {children}
    </li>
  );
}
