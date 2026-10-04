import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLES = {
  company: { table: "companies", paths: ["/app/bedrifter"] },
  contact: { table: "contacts", paths: ["/app/kontakter"] },
  deal: { table: "deals", paths: ["/app/salg"] },
  project: { table: "projects", paths: ["/app/prosjekter"] },
  task: { table: "tasks", paths: ["/app/oppgaver"] },
  note: { table: "activities", paths: [] },
  quote: { table: "quotes", paths: ["/app/tilbud"] },
  product: { table: "products", paths: ["/app/tilbud/produkter"] },
} as const;
type Kind = keyof typeof TABLES;

/**
 * Deletes one record after the "undo" window has passed (called by ToastProvider, also with
 * keepalive when the page is closed). Same rules as before: RLS decides who may delete what.
 */
export async function POST(req: NextRequest) {
  // Only our own pages may call this (route handlers have no built-in CSRF check).
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) return new Response(null, { status: 403 });

  const body = (await req.json().catch(() => null)) as { kind?: string; id?: string } | null;
  const kind = body?.kind as Kind | undefined;
  const id = body?.id ?? "";
  if (!kind || !(kind in TABLES) || !UUID.test(id)) return new Response(null, { status: 400 });

  const { supabase, user, workspace } = await requireWorkspace();
  const ws = workspace.id;

  if (kind === "task") {
    const { data: files } = await supabase.from("task_attachments").select("path").eq("task_id", id).eq("workspace_id", ws);
    if (files && files.length > 0) await supabase.storage.from("attachments").remove(files.map((f) => f.path));
  }

  let error: { message: string } | null = null;
  if (kind === "note") {
    ({ error } = await supabase.from("activities").delete().eq("id", id).eq("workspace_id", ws).eq("author_id", user.id));
  } else if (kind === "quote") {
    const { data: q } = await supabase.from("quotes").select("deal_id").eq("id", id).eq("workspace_id", ws).maybeSingle();
    ({ error } = await supabase.from("quotes").delete().eq("id", id).eq("workspace_id", ws));
    if (q?.deal_id) revalidatePath(`/app/salg/${q.deal_id}`);
  } else {
    ({ error } = await supabase.from(TABLES[kind].table).delete().eq("id", id).eq("workspace_id", ws));
  }
  if (error) return new Response(null, { status: 500 });

  for (const p of TABLES[kind].paths) revalidatePath(p);
  revalidatePath("/app");
  return new Response(null, { status: 204 });
}
