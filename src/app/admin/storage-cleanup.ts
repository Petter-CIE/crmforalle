import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Removes files left behind by companies that deleted themselves. The nightly deletion runs in the
 * database, which cannot empty Storage, so the paths are queued and removed here with the admin's
 * session (admins may delete files in any company). Runs quietly when the admin page opens.
 */
export async function cleanupDeletedFiles(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc("admin_storage_cleanup_list");
  if (error || !data?.length) return 0;
  const done: number[] = [];
  for (const bucket of ["attachments", "logos"] as const) {
    const rows = data.filter((r) => r.bucket === bucket);
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error: removeError } = await supabase.storage.from(bucket).remove(chunk.map((r) => r.path));
      if (removeError) console.error("storage cleanup failed", removeError.message);
      else done.push(...chunk.map((r) => r.id));
    }
  }
  if (done.length) await supabase.rpc("admin_storage_cleanup_done", { p_ids: done });
  return done.length;
}
