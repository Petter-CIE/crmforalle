import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/session";

/** Platform admin status for the signed-in user (cached per request). */
export const adminStatus = cache(async () => {
  const ctx = await requireUser({ returnTo: "/admin" });
  const { data } = await ctx.supabase.rpc("platform_admin_status");
  const row = data?.[0];
  return { ...ctx, isAdmin: !!row?.is_admin, hasAal2: !!row?.has_aal2 };
});
