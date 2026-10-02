"""Generates src/lib/database.types.ts from a compact schema spec.
Keep in sync with supabase/migrations. (Supabase CLI `gen types` gives the same shape.)"""
S, N = "string", "number"
B = "boolean"
# column: (name, ts_type, nullable, has_default)
T = {
 "workspaces": [("id",S,0,1),("name",S,0,0),("org_number",S,1,1),("plan",'Database["public"]["Enums"]["plan_type"]',0,1),("contact_limit",N,0,1),("stripe_customer_id",S,1,1),("trial_ends_at",S,0,1),("discount_percent",N,0,1),("discount_until",S,1,1),("discount_note",S,1,1),("admin_note",S,1,1),("suspended_at",S,1,1),("billing_interval",S,0,1),("accounting_addon",B,0,1),("terms_version",S,1,1),("terms_accepted_at",S,1,1),("terms_accepted_by",S,1,1),("inbound_token",S,1,1),("created_by",S,1,1),("created_at",S,0,1)],
 "profiles": [("id",S,0,0),("email",S,0,0),("full_name",S,1,1),("locale",S,0,1),("notify_email",B,0,1),("created_at",S,0,1)],
 "members": [("workspace_id",S,0,0),("user_id",S,0,0),("role",'Database["public"]["Enums"]["member_role"]',0,1),("created_at",S,0,1)],
 "invitations": [("id",S,0,1),("workspace_id",S,0,0),("email",S,0,0),("role",'Database["public"]["Enums"]["member_role"]',0,1),("token",S,0,1),("invited_by",S,1,1),("created_at",S,0,1),("expires_at",S,0,1),("accepted_at",S,1,1)],
 "companies": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("org_number",S,1,1),("address",S,1,1),("postal_code",S,1,1),("city",S,1,1),("nace_code",S,1,1),("nace_description",S,1,1),("website",S,1,1),("email",S,1,1),("phone",S,1,1),("notes",S,1,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "contacts": [("id",S,0,1),("workspace_id",S,0,0),("company_id",S,1,1),("first_name",S,0,0),("last_name",S,1,1),("email",S,1,1),("phone",S,1,1),("title",S,1,1),("address",S,1,1),("postal_code",S,1,1),("city",S,1,1),("marketing_consent",B,0,1),("marketing_consent_at",S,1,1),("notes",S,1,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "projects": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("description",S,1,1),("color",S,0,1),("archived",B,0,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "project_contacts": [("workspace_id",S,0,0),("project_id",S,0,0),("contact_id",S,0,0),("created_at",S,0,1)],
 "project_companies": [("workspace_id",S,0,0),("project_id",S,0,0),("company_id",S,0,0),("created_at",S,0,1)],
 "pipeline_stages": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("position",N,0,1),("probability",N,0,1),("is_won",B,0,1),("is_lost",B,0,1),("created_at",S,0,1)],
 "deals": [("id",S,0,1),("workspace_id",S,0,0),("title",S,0,0),("value",N,0,1),("currency",S,0,1),("stage_id",S,0,0),("company_id",S,1,1),("contact_id",S,1,1),("project_id",S,1,1),("owner_id",S,1,1),("expected_close",S,1,1),("closed_at",S,1,1),("lost_reason",S,1,1),("position",N,0,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "tasks": [("id",S,0,1),("workspace_id",S,0,0),("title",S,0,0),("description",S,1,1),("due_at",S,1,1),("started_at",S,1,1),("done_at",S,1,1),("assignee_id",S,1,1),("company_id",S,1,1),("contact_id",S,1,1),("deal_id",S,1,1),("project_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "task_members": [("task_id",S,0,0),("workspace_id",S,0,0),("user_id",S,0,0),("added_by",S,1,1),("created_at",S,0,1)],
 "task_comments": [("id",S,0,1),("workspace_id",S,0,0),("task_id",S,0,0),("author_id",S,1,1),("body",S,0,0),("created_at",S,0,1)],
 "task_attachments": [("id",S,0,1),("workspace_id",S,0,0),("task_id",S,0,0),("path",S,0,0),("name",S,0,0),("size",N,0,1),("mime",S,1,1),("uploaded_by",S,1,1),("created_at",S,0,1)],
 "inbound_emails": [("id",S,0,1),("workspace_id",S,0,0),("message_id",S,1,1),("from_email",S,0,0),("from_name",S,1,1),("to_emails","string[]",0,1),("cc_emails","string[]",0,1),("external_emails","string[]",0,1),("subject",S,1,1),("body",S,1,1),("sent_at",S,0,1),("author_id",S,1,1),("status",S,0,1),("linked_count",N,0,1),("created_at",S,0,1)],
 "activities": [("id",S,0,1),("workspace_id",S,0,0),("type",S,0,0),("body",S,1,1),("company_id",S,1,1),("contact_id",S,1,1),("deal_id",S,1,1),("author_id",S,1,1),("occurred_at",S,0,1),("created_at",S,0,1)],
}
# relationships: table -> [(fk_name, [cols], ref_table, [ref_cols])]
def ws(t, col, ref): return (f"{t}_{col}_workspace_id_fkey", [col, "workspace_id"], ref, ["id", "workspace_id"])
def p(t, col): return (f"{t}_{col}_fkey", [col], "profiles", ["id"])
def w(t): return (f"{t}_workspace_id_fkey", ["workspace_id"], "workspaces", ["id"])
R = {
 "workspaces": [p("workspaces","created_by"), p("workspaces","terms_accepted_by")],
 "profiles": [],
 "members": [p("members","user_id"), w("members")],
 "invitations": [p("invitations","invited_by"), w("invitations")],
 "companies": [p("companies","created_by"), p("companies","owner_id"), w("companies")],
 "contacts": [ws("contacts","company_id","companies"), p("contacts","created_by"), p("contacts","owner_id"), w("contacts")],
 "projects": [p("projects","created_by"), p("projects","owner_id"), w("projects")],
 "project_contacts": [ws("project_contacts","contact_id","contacts"), ws("project_contacts","project_id","projects"), w("project_contacts")],
 "inbound_emails": [p("inbound_emails","author_id"), w("inbound_emails")],
 "project_companies": [ws("project_companies","company_id","companies"), ws("project_companies","project_id","projects"), w("project_companies")],
 "pipeline_stages": [w("pipeline_stages")],
 "deals": [ws("deals","company_id","companies"), ws("deals","contact_id","contacts"), p("deals","created_by"), p("deals","owner_id"), ws("deals","project_id","projects"), ws("deals","stage_id","pipeline_stages"), w("deals")],
 "tasks": [p("tasks","assignee_id"), ws("tasks","company_id","companies"), ws("tasks","contact_id","contacts"), p("tasks","created_by"), ws("tasks","deal_id","deals"), ("tasks_project_fk", ["project_id", "workspace_id"], "projects", ["id", "workspace_id"]), w("tasks")],
 "task_members": [p("task_members","user_id"), p("task_members","added_by"), ws("task_members","task_id","tasks"), w("task_members")],
 "task_comments": [p("task_comments","author_id"), ws("task_comments","task_id","tasks"), w("task_comments")],
 "task_attachments": [p("task_attachments","uploaded_by"), ws("task_attachments","task_id","tasks"), w("task_attachments")],
 "activities": [p("activities","author_id"), ws("activities","company_id","companies"), ws("activities","contact_id","contacts"), ws("activities","deal_id","deals"), w("activities")],
}
o = ["// Generated by scripts/gen-types.py – mirrors `supabase gen types`. Do not edit by hand.",
     "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];", "",
     "export type Database = {", "  __InternalSupabase: { PostgrestVersion: \"14.18\" };", "  public: {", "    Tables: {"]
for t in sorted(T):
    cols = T[t]
    o.append(f"      {t}: {{")
    o.append("        Row: {" + " ".join(f"{c}: {ty}{' | null' if n else ''};" for c,ty,n,d in cols) + " };")
    o.append("        Insert: {" + " ".join(f"{c}{'?' if (d or n) else ''}: {ty}{' | null' if n else ''};" for c,ty,n,d in cols) + " };")
    o.append("        Update: {" + " ".join(f"{c}?: {ty}{' | null' if n else ''};" for c,ty,n,d in cols) + " };")
    rels = ", ".join("{ foreignKeyName: \"%s\"; columns: [%s]; isOneToOne: false; referencedRelation: \"%s\"; referencedColumns: [%s] }" % (fk, ", ".join(f'"{c}"' for c in cs), rt, ", ".join(f'"{c}"' for c in rc)) for fk,cs,rt,rc in R[t])
    o.append(f"        Relationships: [{rels}];")
    o.append("      };")
o += ["    };", "    Views: { [_ in never]: never };", "    Functions: {",
      "      accept_invitation: { Args: { p_token: string }; Returns: string };",
      "      create_workspace: { Args: { p_name: string; p_org_number?: string }; Returns: string };",
      '      platform_admin_status: { Args: never; Returns: { is_admin: boolean; has_aal2: boolean }[] };',
      '      admin_workspaces: { Args: never; Returns: { id: string; name: string; org_number: string | null; plan: Database["public"]["Enums"]["plan_type"]; trial_ends_at: string; contact_limit: number; discount_percent: number; discount_until: string | null; discount_note: string | null; admin_note: string | null; suspended_at: string | null; created_at: string; owner_email: string | null; owner_name: string | null; member_count: number; contact_count: number; last_activity: string | null }[] };',
      '      admin_workspace_members: { Args: { p_id: string }; Returns: { user_id: string; email: string; full_name: string | null; role: Database["public"]["Enums"]["member_role"]; joined_at: string; last_sign_in_at: string | null }[] };',
      '      admin_audit_log: { Args: { p_id: string }; Returns: { created_at: string; admin_email: string | null; changes: Json }[] };',
      '      admin_update_workspace: { Args: { p_id: string; p_plan: Database["public"]["Enums"]["plan_type"]; p_trial_ends_at: string; p_contact_limit: number; p_discount_percent: number; p_discount_until: string | null; p_discount_note: string | null; p_admin_note: string | null; p_suspended: boolean }; Returns: undefined };',
      '      admin_workspaces_v2: { Args: never; Returns: { id: string; name: string; org_number: string | null; plan: Database["public"]["Enums"]["plan_type"]; trial_ends_at: string; contact_limit: number; discount_percent: number; discount_until: string | null; discount_note: string | null; admin_note: string | null; suspended_at: string | null; created_at: string; owner_email: string | null; owner_name: string | null; member_count: number; contact_count: number; last_activity: string | null; billing_interval: string; accounting_addon: boolean }[] };',
      '      admin_update_billing: { Args: { p_id: string; p_interval: string; p_addon: boolean }; Returns: undefined };',
      '      accept_terms: { Args: { p_workspace: string; p_version: string }; Returns: undefined };',
      '      rotate_inbound_token: { Args: { p_workspace: string }; Returns: string };',
      '      disable_inbound: { Args: { p_workspace: string }; Returns: undefined };',
      '      inbound_try_lock: { Args: Record<string, never>; Returns: boolean };',
      '      ingest_inbound_email: { Args: { p_token: string; p_message_id: string | null; p_from_email: string; p_from_name: string | null; p_to: string[]; p_cc: string[]; p_forwarded_from: string | null; p_subject: string | null; p_body: string | null; p_sent_at: string | null }; Returns: string };',
      '      my_invitations: { Args: never; Returns: { token: string; workspace_name: string; role: Database["public"]["Enums"]["member_role"]; invited_by_name: string | null }[] };',
      "    };", "    Enums: {", '      member_role: "owner" | "admin" | "user";', '      plan_type: "trial" | "start" | "bedrift" | "free";',
      "    };", "    CompositeTypes: { [_ in never]: never };", "  };", "};", "",
      'export type MemberRole = Database["public"]["Enums"]["member_role"];',
      'export type PlanType = Database["public"]["Enums"]["plan_type"];',
      'export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];', ""]
open("/home/claude/crmforalle/src/lib/database.types.ts","w").write("\n".join(o))
