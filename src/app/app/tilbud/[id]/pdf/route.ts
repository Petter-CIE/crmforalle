import { quotePdf } from "@/lib/quote-pdf";
import { loadQuote } from "@/lib/quote-data";
import { requireWorkspace } from "@/lib/session";

/** PDF of a quote for signed-in members (preview of drafts too). */
export async function GET(_req: Request, { params }: RouteContext<"/app/tilbud/[id]/pdf">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const ctx = await requireWorkspace();
  const data = await loadQuote(ctx, id);
  if (!data) return new Response("Not found", { status: 404 });
  const pdf = await quotePdf(data.doc);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Tilbud-${data.doc.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
