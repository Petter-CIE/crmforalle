import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import type { Database } from "@/lib/database.types";
import { notifyLead } from "@/lib/notify";

// Public endpoint for web forms ("lead forms"). Works from our hosted form page, from a plain
// HTML <form> on the customer's own website (redirects back) and from fetch() (JSON).

export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type Result = { ok: boolean; error?: "invalid" | "rate_limited" | "not_found" | "failed"; thankYou?: string | null };

async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")]));
  }
  const fd = await req.formData().catch(() => null);
  const out: Record<string, string> = {};
  fd?.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

export async function POST(req: Request, ctx: RouteContext<"/api/lead/[key]">) {
  const { key } = await ctx.params;
  const body = await readBody(req);
  const wantsJson = (req.headers.get("accept") ?? "").includes("application/json") || (req.headers.get("content-type") ?? "").includes("json");
  const back = body._redirect || req.headers.get("referer") || "";

  const respond = (r: Result, status = 200) => {
    if (wantsJson) return Response.json(r, { status, headers: CORS });
    // Plain HTML form: go back to the page it came from (with ?sendt=1 / ?feil=...) or to our thank-you page.
    let target = `/skjema/${encodeURIComponent(key)}?${r.ok ? "sendt=1" : `feil=${r.error}`}`;
    try {
      const u = new URL(back);
      if (/^https?:$/.test(u.protocol) && !u.pathname.startsWith("/skjema/")) {
        u.searchParams.set(r.ok ? "sendt" : "feil", r.ok ? "1" : (r.error ?? "failed"));
        target = u.toString();
      }
    } catch {
      // no usable referer
    }
    return new Response(null, { status: 303, headers: { ...CORS, location: target } });
  };

  if (!/^[0-9a-f]{36}$/.test(key)) return respond({ ok: false, error: "not_found" }, 404);
  // Spam traps: a hidden field that people leave empty, and forms sent faster than a human can type.
  if (body.website_url || body.company_url) return respond({ ok: true });
  const started = Number(body._t);
  if (Number.isFinite(started) && started > 0 && Date.now() - started < 2500) return respond({ ok: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("lead_submit", {
    p_key: key,
    p_ip: ip,
    p_data: {
      name: body.name ?? [body.first_name, body.last_name].filter(Boolean).join(" "),
      email: body.email ?? "",
      phone: body.phone ?? body.telefon ?? "",
      company: body.company ?? body.firma ?? "",
      message: body.message ?? body.melding ?? "",
    },
  });
  if (error) {
    const code = error.message.includes("rate_limited") ? "rate_limited" : error.message.includes("invalid") ? "invalid" : error.message.includes("not_found") ? "not_found" : "failed";
    if (code === "failed") console.error("lead_submit failed", error.message);
    return respond({ ok: false, error: code }, code === "not_found" ? 404 : code === "failed" ? 500 : 400);
  }

  const r = data as { owner_email?: string; notify?: boolean; locale?: string; workspace?: string; form?: string; url?: string; thank_you?: string | null; name?: string; email?: string; phone?: string; company?: string; message?: string } | null;
  if (r?.owner_email && r.notify !== false) {
    after(() =>
      notifyLead({
        to: r.owner_email!,
        locale: r.locale ?? "nb",
        workspace: r.workspace ?? "",
        form: r.form ?? "",
        url: r.url ?? "/app",
        name: r.name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        company: r.company ?? "",
        message: r.message ?? "",
      }),
    );
  }
  return respond({ ok: true, thankYou: r?.thank_you ?? null });
}
