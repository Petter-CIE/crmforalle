import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// One-click unsubscribe (RFC 8058) from the List-Unsubscribe header in Gmail, Outlook and others.
// A GET (someone opening the address) goes to the confirmation page instead.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RouteContext<"/api/kampanje/avmeld/[token]">) {
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{36}$/.test(token)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await db.rpc("campaign_unsubscribe", { p_token: token });
  return new Response(null, { status: data ? 200 : 404 });
}

export async function GET(req: Request, ctx: RouteContext<"/api/kampanje/avmeld/[token]">) {
  const { token } = await ctx.params;
  return Response.redirect(new URL(`/avmelding/${encodeURIComponent(token)}`, req.url), 303);
}
