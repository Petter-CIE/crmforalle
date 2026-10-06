import { NextResponse, type NextRequest } from "next/server";
import { showInline } from "@/lib/attachments";
import { requireWorkspace } from "@/lib/session";

/** Opens an attachment through a short-lived signed URL (the bucket is private). */
export async function GET(req: NextRequest, ctx: RouteContext<"/app/oppgaver/[id]/vedlegg/[vid]">) {
  const { id, vid } = await ctx.params;
  const { supabase, workspace } = await requireWorkspace();
  const { data: file } = await supabase
    .from("task_attachments")
    .select("path, name, mime")
    .eq("id", vid)
    .eq("task_id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!file) return new NextResponse("Not found", { status: 404 });
  // only images and PDFs are opened in the browser; anything else is always downloaded
  const download = req.nextUrl.searchParams.get("last-ned") === "1" || !showInline(file.mime);
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(file.path, 60, download ? { download: file.name } : undefined);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
