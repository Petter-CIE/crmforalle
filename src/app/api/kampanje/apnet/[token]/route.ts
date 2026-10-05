import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// 1×1 transparent GIF that records the first time a campaign e-mail was opened.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/kampanje/apnet/[token]">) {
  const { token } = await ctx.params;
  if (/^[0-9a-f]{36}$/.test(token)) {
    const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    await db.rpc("campaign_open", { p_token: token });
  }
  return new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" } });
}
