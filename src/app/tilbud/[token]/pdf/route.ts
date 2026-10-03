import { createClient } from "@/lib/supabase/server";
import { quotePdf } from "@/lib/quote-pdf";
import type { QuoteDocument } from "@/lib/quotes";

/** PDF of a sent quote for the customer, by its secret link. */
export async function GET(_req: Request, { params }: RouteContext<"/tilbud/[token]/pdf">) {
  const { token } = await params;
  if (!/^[0-9a-f]{36}$/.test(token)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("quote_public", { p_token: token });
  if (!data) return new Response("Not found", { status: 404 });
  const doc = data as unknown as QuoteDocument;
  const pdf = await quotePdf(doc);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Tilbud-${doc.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
