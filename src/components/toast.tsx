"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type DeleteKind = "company" | "contact" | "deal" | "task" | "note" | "project" | "quote" | "product";

export type ToastTexts = {
  undo: string;
  close: string;
  deleteFailed: string;
  /** Messages for the short "flash" cookie set by server actions before a redirect. */
  flash: Record<string, string>;
};

type Toast = {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
  duration: number;
};

type PendingDelete = {
  kind: DeleteKind;
  id: string;
  returnTo: string | null;
  timer: ReturnType<typeof setTimeout>;
  toastId: number;
};

type ToastApi = {
  toast: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"]; duration?: number }) => number;
  dismiss: (id: number) => void;
  /** Hides the item right away and deletes it for real after a few seconds unless the user presses "Undo". */
  scheduleDelete: (d: { kind: DeleteKind; id: string; message: string; redirectTo?: string }) => void;
};

const Ctx = createContext<ToastApi | null>(null);
export function useToast() {
  return useContext(Ctx);
}

const UNDO_MS = 6000;
const FLASH_COOKIE = "cfa_flash";

function sendDelete(kind: DeleteKind, id: string) {
  return fetch("/app/slett", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, id }),
    keepalive: true,
  });
}

export function ToastProvider({ t, children }: { t: ToastTexts; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const pending = useRef(new Map<string, PendingDelete>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>(
    (message, opts = {}) => {
      const id = nextId.current++;
      const item: Toast = { id, message, tone: opts.tone ?? "success", action: opts.action, duration: opts.duration ?? (opts.action ? UNDO_MS : 3500) };
      setToasts((all) => [...all.slice(-2), item]);
      setTimeout(() => dismiss(id), item.duration);
      return id;
    },
    [dismiss],
  );

  const commit = useCallback(
    async (key: string) => {
      const p = pending.current.get(key);
      if (!p) return;
      pending.current.delete(key);
      clearTimeout(p.timer);
      try {
        const res = await sendDelete(p.kind, p.id);
        if (!res.ok) throw new Error(String(res.status));
        router.refresh();
      } catch {
        setHidden((h) => h.filter((x) => x !== p.id));
        toast(t.deleteFailed, { tone: "error" });
      }
    },
    [router, toast, t.deleteFailed],
  );

  const scheduleDelete = useCallback<ApiDelete>(
    ({ kind, id, message, redirectTo }) => {
      const key = `${kind}:${id}`;
      if (pending.current.has(key)) return;
      setHidden((h) => [...h, id]);
      const returnTo = redirectTo ? window.location.pathname + window.location.search : null;
      if (redirectTo) router.push(redirectTo);
      const toastId = toast(message, {
        action: {
          label: t.undo,
          onClick: () => {
            const p = pending.current.get(key);
            if (!p) return;
            clearTimeout(p.timer);
            pending.current.delete(key);
            setHidden((h) => h.filter((x) => x !== id));
            dismiss(p.toastId);
            if (p.returnTo) router.push(p.returnTo);
          },
        },
      });
      const timer = setTimeout(() => commit(key), UNDO_MS);
      pending.current.set(key, { kind, id, returnTo, timer, toastId });
    },
    [router, toast, dismiss, commit, t.undo],
  );

  // Leaving the page or switching app: carry out the pending deletes now.
  useEffect(() => {
    const flush = () => {
      for (const [key, p] of pending.current) {
        clearTimeout(p.timer);
        pending.current.delete(key);
        void sendDelete(p.kind, p.id).catch(() => {});
      }
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Show the message a server action left before redirecting ("Saved", "Created" …).
  useEffect(() => {
    const timer = setTimeout(() => {
      const m = document.cookie.match(new RegExp(`(?:^|; )${FLASH_COOKIE}=([^;]+)`));
      if (!m) return;
      document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`;
      const text = t.flash[decodeURIComponent(m[1])];
      if (text) toast(text);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, toast, t.flash]);

  const api = useMemo(() => ({ toast, dismiss, scheduleDelete }), [toast, dismiss, scheduleDelete]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {hidden.length > 0 && (
        <style>{hidden.map((id) => `[data-del="${id.replace(/[^0-9a-f-]/gi, "")}"]`).join(",") + "{display:none!important}"}</style>
      )}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            role={x.tone === "error" ? "alert" : "status"}
            className="toast-in pointer-events-auto relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl bg-[#1f2522] px-4 py-3 text-sm text-white shadow-xl ring-1 ring-white/10"
          >
            <span aria-hidden className={x.tone === "error" ? "font-bold text-red-300" : "text-emerald-300"}>
              {x.tone === "error" ? "!" : x.tone === "info" ? "↻" : "✓"}
            </span>
            <span className="min-w-0 flex-1">{x.message}</span>
            {x.action && (
              <button
                type="button"
                onClick={() => {
                  x.action?.onClick();
                  dismiss(x.id);
                }}
                className="rounded-md px-2 py-1 font-semibold text-emerald-300 hover:bg-white/10"
              >
                {x.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(x.id)} aria-label={t.close} className="px-1 opacity-60 hover:opacity-100">
              ×
            </button>
            {x.action && (
              <span
                aria-hidden
                className="toast-timer absolute bottom-0 left-0 h-0.5 bg-emerald-300/70"
                style={{ animationDuration: `${x.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
type ApiDelete = ToastApi["scheduleDelete"];
