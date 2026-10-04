"use server";

import { after } from "next/server";
import type { FormResult } from "@/app/app/crm-actions";
import { getI18n } from "@/lib/i18n/server";
import { notifyFeedback } from "@/lib/notify";
import { requireWorkspace } from "@/lib/session";

const KINDS = ["idea", "bug", "other"] as const;

/** Stores feedback from a user and e-mails it to the AllSeats team. */
export async function sendFeedback(_p: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user, workspace } = await requireWorkspace();
  const { t } = await getI18n();
  const f = t.feedback;
  const raw = String(formData.get("kind") ?? "");
  const kind = (KINDS as readonly string[]).includes(raw) ? (raw as (typeof KINDS)[number]) : "other";
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  // Only a path inside the app is kept (where the user came from).
  const pageRaw = String(formData.get("page") ?? "");
  const page = /^\/app[\w\-/]*$/.test(pageRaw) ? pageRaw.slice(0, 300) : null;
  if (message.length < 3) return { error: f.tooShort };

  const { error } = await supabase.rpc("submit_feedback", { p_workspace: workspace.id, p_kind: kind, p_page: page ?? "", p_message: message });
  if (error) {
    console.error("submit_feedback failed", error.message);
    return { error: f.failed };
  }
  const [{ data: profile }, { data: w }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("workspaces").select("pilot_at").eq("id", workspace.id).maybeSingle(),
  ]);
  after(() =>
    notifyFeedback({
      workspace: workspace.name,
      pilot: !!w?.pilot_at,
      sender: profile?.full_name || user.email || "?",
      senderEmail: user.email ?? "",
      kind,
      page,
      message,
    }),
  );
  return { ok: true, message: f.sent };
}
