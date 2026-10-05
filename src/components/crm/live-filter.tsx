"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Put inside a GET filter form: the list updates while typing (short pause) and as soon as a
 * dropdown or checkbox changes, without pressing the filter button.
 */
export function LiveFilter({ delay = 300 }: { delay?: number }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      const params = new URLSearchParams();
      for (const [k, v] of new FormData(form)) {
        if (typeof v === "string" && v.trim() !== "") params.set(k, v.trim());
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };
    const isToggle = (el: HTMLInputElement) => el.type === "checkbox" || el.tagName === "SELECT";
    // Typing: wait for a short pause. Dropdowns and checkboxes: apply right away.
    const onInput = (e: Event) => {
      if (isToggle(e.target as HTMLInputElement)) return;
      clearTimeout(timer);
      timer = setTimeout(apply, delay);
    };
    const onChange = (e: Event) => {
      if (!isToggle(e.target as HTMLInputElement)) return;
      clearTimeout(timer);
      apply();
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
    };
  }, [router, pathname, delay]);

  return <span ref={anchor} hidden />;
}
