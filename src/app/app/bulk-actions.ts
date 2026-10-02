"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { requireWorkspace } from "@/lib/session";

export type BulkState = { ok?: boolean; message?: string; at?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 1000;
const OPS = ["add_project", "remove_project", "owner", "delete"] as const;
type Op = (typeof OPS)[number];

/** Applies one action to many companies or contacts at once (from the list pages). */
export async function bulkEdit(_prev: BulkState, formData: FormData): Promise<BulkState> {
  const { supabase, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const fail = { ok: false, message: t.bulk.error, at: Date.now() };

  const kind = formData.get("kind") === "contacts" ? "contacts" : "companies";
  const op = String(formData.get("op") ?? "") as Op;
  const ids = [...new Set(formData.getAll("ids").map(String).filter((v) => UUID.test(v)))].slice(0, MAX);
  if (!ids.length || !OPS.includes(op)) return { ok: false, message: t.bulk.nothing, at: Date.now() };

  const projectId = String(formData.get("project_id") ?? "");
  const ownerRaw = String(formData.get("owner_id") ?? "");
  const link = kind === "contacts" ? "project_contacts" : "project_companies";
  const col = kind === "contacts" ? "contact_id" : "company_id";

  if (op === "add_project" || op === "remove_project") {
    if (!UUID.test(projectId)) return { ok: false, message: t.bulk.chooseProject, at: Date.now() };
    if (op === "add_project") {
      const rows = ids.map((id) => ({ workspace_id: workspace.id, project_id: projectId, [col]: id }));
      const { error } =
        kind === "contacts"
          ? await supabase
              .from("project_contacts")
              .upsert(rows as { workspace_id: string; project_id: string; contact_id: string }[], { ignoreDuplicates: true })
          : await supabase
              .from("project_companies")
              .upsert(rows as { workspace_id: string; project_id: string; company_id: string }[], { ignoreDuplicates: true });
      if (error) return fail;
    } else {
      const { error } = await supabase
        .from(link)
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("project_id", projectId)
        .in(col, ids);
      if (error) return fail;
    }
    revalidatePath(`/app/prosjekter/${projectId}`);
  } else if (op === "owner") {
    // empty value clears the owner; the database checks that the new owner is a member
    const owner = ownerRaw === "" ? null : UUID.test(ownerRaw) ? ownerRaw : undefined;
    if (owner === undefined) return fail;
    const { error } = await supabase.from(kind).update({ owner_id: owner }).eq("workspace_id", workspace.id).in("id", ids);
    if (error) return fail;
  } else {
    const { error } = await supabase.from(kind).delete().eq("workspace_id", workspace.id).in("id", ids);
    if (error) return fail;
  }

  revalidatePath(kind === "contacts" ? "/app/kontakter" : "/app/bedrifter");
  return { ok: true, message: t.bulk.done.replace("{n}", String(ids.length)), at: Date.now() };
}
