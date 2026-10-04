"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { filterQuery, parseFilters } from "@/lib/list-filters";
import { requireWorkspace } from "@/lib/session";

const PATH = { companies: "/app/bedrifter", contacts: "/app/kontakter" } as const;

/** Saves the current filters of a list as a named view (optionally shared with the team). */
export async function saveView(entity: "companies" | "contacts", name: string, query: string, shared: boolean) {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  if (!(entity in PATH)) return { error: t.crm.error };
  const clean = name.trim().slice(0, 60);
  // Normalise the query through the same parser the lists use.
  const q = filterQuery(parseFilters(Object.fromEntries(new URLSearchParams(query))));
  if (!clean || !q) return { error: t.crm.required };
  const { error } = await supabase.from("saved_views").insert({ workspace_id: workspace.id, user_id: user.id, entity, name: clean, query: q, shared });
  if (error) return { error: t.crm.error };
  revalidatePath(PATH[entity]);
  return { ok: true, message: t.views.saved };
}

export async function deleteView(id: string, entity: "companies" | "contacts") {
  const { supabase, workspace } = await requireWorkspace();
  await supabase.from("saved_views").delete().eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath(PATH[entity] ?? "/app");
}
