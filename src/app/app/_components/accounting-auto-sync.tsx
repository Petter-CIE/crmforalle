"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { autoSyncAccounting } from "@/app/app/innstillinger/accounting-actions";

/** Once per app visit: lets the server sync the accounting data if it is older than six hours. */
export function AccountingAutoSync() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    autoSyncAccounting()
      .then((ran) => {
        if (ran && !cancelled) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
