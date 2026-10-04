"""Generates src/lib/database.types.ts from a compact schema spec.
Keep in sync with supabase/migrations. (Supabase CLI `gen types` gives the same shape.)"""
S, N = "string", "number"
B = "boolean"
# column: (name, ts_type, nullable, has_default)
T = {
 "workspaces": [("id",S,0,1),("name",S,0,0),("org_number",S,1,1),("plan",'Database["public"]["Enums"]["plan_type"]',0,1),("contact_limit",N,0,1),("stripe_customer_id",S,1,1),("trial_ends_at",S,0,1),("discount_percent",N,0,1),("discount_until",S,1,1),("discount_note",S,1,1),("admin_note",S,1,1),("suspended_at",S,1,1),("billing_interval",S,0,1),("accounting_addon",B,0,1),("extra_contact_packs",N,0,1),("terms_version",S,1,1),("terms_accepted_at",S,1,1),("terms_accepted_by",S,1,1),("inbound_token",S,1,1),("quote_address",S,1,1),("quote_email",S,1,1),("quote_phone",S,1,1),("quote_bank_account",S,1,1),("quote_terms",S,1,1),("quote_valid_days",N,0,1),("logo_path",S,1,1),("invoice_email",S,1,1),("invoice_reference",S,1,1),("ordered_at",S,1,1),("ordered_by",S,1,1),("created_by",S,1,1),("created_at",S,0,1)],
 "profiles": [("id",S,0,0),("email",S,0,0),("full_name",S,1,1),("locale",S,0,1),("notify_email",B,0,1),("idle_timeout_minutes",N,0,1),("digest_email",B,0,1),("dashboard","Json",1,1),("created_at",S,0,1)],
 "members": [("workspace_id",S,0,0),("user_id",S,0,0),("role",'Database["public"]["Enums"]["member_role"]',0,1),("created_at",S,0,1)],
 "invitations": [("id",S,0,1),("workspace_id",S,0,0),("email",S,0,0),("role",'Database["public"]["Enums"]["member_role"]',0,1),("token",S,0,1),("invited_by",S,1,1),("created_at",S,0,1),("expires_at",S,0,1),("accepted_at",S,1,1)],
 "companies": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("org_number",S,1,1),("address",S,1,1),("postal_code",S,1,1),("city",S,1,1),("nace_code",S,1,1),("nace_description",S,1,1),("website",S,1,1),("email",S,1,1),("phone",S,1,1),("notes",S,1,1),("custom","Json",0,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1),("brreg_snapshot","Json",1,1),("brreg_status",S,1,1),("brreg_checked_at",S,1,1),("last_activity_at",S,1,1)],
 "contacts": [("id",S,0,1),("workspace_id",S,0,0),("company_id",S,1,1),("first_name",S,0,0),("last_name",S,1,1),("email",S,1,1),("phone",S,1,1),("title",S,1,1),("address",S,1,1),("postal_code",S,1,1),("city",S,1,1),("marketing_consent",B,0,1),("marketing_consent_at",S,1,1),("notes",S,1,1),("custom","Json",0,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1),("last_activity_at",S,1,1)],
 "projects": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("description",S,1,1),("color",S,0,1),("archived",B,0,1),("owner_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "project_contacts": [("workspace_id",S,0,0),("project_id",S,0,0),("contact_id",S,0,0),("created_at",S,0,1)],
 "project_companies": [("workspace_id",S,0,0),("project_id",S,0,0),("company_id",S,0,0),("created_at",S,0,1)],
 "pipeline_stages": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("position",N,0,1),("probability",N,0,1),("is_won",B,0,1),("is_lost",B,0,1),("created_at",S,0,1)],
 "deals": [("id",S,0,1),("workspace_id",S,0,0),("title",S,0,0),("value",N,0,1),("currency",S,0,1),("stage_id",S,0,0),("company_id",S,1,1),("contact_id",S,1,1),("project_id",S,1,1),("owner_id",S,1,1),("expected_close",S,1,1),("closed_at",S,1,1),("lost_reason",S,1,1),("custom","Json",0,1),("position",N,0,1),("stage_changed_at",S,0,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "tasks": [("id",S,0,1),("workspace_id",S,0,0),("title",S,0,0),("description",S,1,1),("due_at",S,1,1),("started_at",S,1,1),("done_at",S,1,1),("assignee_id",S,1,1),("company_id",S,1,1),("contact_id",S,1,1),("deal_id",S,1,1),("project_id",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "task_members": [("task_id",S,0,0),("workspace_id",S,0,0),("user_id",S,0,0),("added_by",S,1,1),("created_at",S,0,1)],
 "task_comments": [("id",S,0,1),("workspace_id",S,0,0),("task_id",S,0,0),("author_id",S,1,1),("body",S,0,0),("created_at",S,0,1)],
 "task_attachments": [("id",S,0,1),("workspace_id",S,0,0),("task_id",S,0,0),("path",S,0,0),("name",S,0,0),("size",N,0,1),("mime",S,1,1),("uploaded_by",S,1,1),("created_at",S,0,1)],
 "inbound_emails": [("id",S,0,1),("workspace_id",S,0,0),("message_id",S,1,1),("from_email",S,0,0),("from_name",S,1,1),("to_emails","string[]",0,1),("cc_emails","string[]",0,1),("external_emails","string[]",0,1),("subject",S,1,1),("body",S,1,1),("sent_at",S,0,1),("author_id",S,1,1),("status",S,0,1),("linked_count",N,0,1),("created_at",S,0,1)],
 "integrations": [("workspace_id",S,0,0),("provider",S,0,0),("credentials",S,0,0),("external_company",S,1,1),("last_sync_at",S,1,1),("last_error",S,1,1),("sync_started_at",S,1,1),("connected_by",S,1,1),("created_at",S,0,1)],
 "integration_links": [("workspace_id",S,0,0),("provider",S,0,0),("entity",S,0,0),("external_id",S,0,0),("local_id",S,0,0)],
 "external_invoices": [("workspace_id",S,0,0),("provider",S,0,0),("external_id",S,0,0),("company_id",S,1,1),("invoice_number",S,1,1),("invoice_date",S,1,1),("due_date",S,1,1),("amount",N,0,1),("amount_ex_vat",N,0,1),("outstanding",N,0,1),("currency",S,0,1),("is_credit_note",B,0,1),("overdue_task_id",S,1,1),("synced_at",S,0,1)],
 "custom_fields": [("id",S,0,1),("workspace_id",S,0,0),("entity",S,0,0),("label",S,0,0),("type",S,0,0),("options","string[]",0,1),("position",N,0,1),("created_at",S,0,1)],
 "products": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("description",S,1,1),("sku",S,1,1),("unit",S,0,1),("unit_price",N,0,1),("vat_rate",N,0,1),("active",B,0,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "quotes": [("id",S,0,1),("workspace_id",S,0,0),("number",N,0,1),("title",S,0,0),("status",S,0,1),("deal_id",S,1,1),("company_id",S,1,1),("contact_id",S,1,1),("valid_until",S,1,1),("intro",S,1,1),("terms",S,1,1),("total_ex_vat",N,0,1),("total_vat",N,0,1),("total",N,0,1),("public_token",S,0,1),("sent_at",S,1,1),("sent_to",S,1,1),("viewed_at",S,1,1),("view_count",N,0,1),("responded_at",S,1,1),("responder_name",S,1,1),("response_comment",S,1,1),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "quote_lines": [("id",S,0,1),("workspace_id",S,0,0),("quote_id",S,0,0),("position",N,0,1),("product_id",S,1,1),("description",S,0,0),("quantity",N,0,1),("unit",S,0,1),("unit_price",N,0,1),("discount_percent",N,0,1),("vat_rate",N,0,1)],
 "automations": [("id",S,0,1),("workspace_id",S,0,0),("stage_id",S,0,0),("task_title",S,0,0),("due_days",N,0,1),("active",B,0,1),("created_by",S,1,1),("created_at",S,0,1)],
 "push_subscriptions": [("id",S,0,1),("user_id",S,0,0),("endpoint",S,0,0),("p256dh",S,0,0),("auth",S,0,0),("user_agent",S,1,1),("disabled_at",S,1,1),("created_at",S,0,1)],
 "lead_forms": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("public_key",S,0,1),("active",B,0,1),("owner_id",S,1,1),("project_id",S,1,1),("create_deal",B,0,1),("create_task",B,0,1),("ask_phone",B,0,1),("ask_company",B,0,1),("require_message",B,0,1),("title",S,1,1),("intro",S,1,1),("button_text",S,1,1),("thank_you",S,1,1),("submissions",N,0,1),("last_submission_at",S,1,1),("created_by",S,1,1),("created_at",S,0,1)],
 "email_templates": [("id",S,0,1),("workspace_id",S,0,0),("name",S,0,0),("subject",S,0,0),("body",S,0,0),("created_by",S,1,1),("created_at",S,0,1),("updated_at",S,0,1)],
 "saved_views": [("id",S,0,1),("workspace_id",S,0,0),("user_id",S,0,0),("entity",S,0,0),("name",S,0,0),("query",S,0,0),("shared",B,0,1),("created_at",S,0,1)],
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
 "integrations": [p("integrations","connected_by"), w("integrations")],
 "integration_links": [w("integration_links")],
 "external_invoices": [ws("external_invoices","company_id","companies"), ("external_invoices_overdue_task_id_fkey", ["overdue_task_id"], "tasks", ["id"]), w("external_invoices")],
 "project_companies": [ws("project_companies","company_id","companies"), ws("project_companies","project_id","projects"), w("project_companies")],
 "pipeline_stages": [w("pipeline_stages")],
 "deals": [ws("deals","company_id","companies"), ws("deals","contact_id","contacts"), p("deals","created_by"), p("deals","owner_id"), ws("deals","project_id","projects"), ws("deals","stage_id","pipeline_stages"), w("deals")],
 "tasks": [p("tasks","assignee_id"), ws("tasks","company_id","companies"), ws("tasks","contact_id","contacts"), p("tasks","created_by"), ws("tasks","deal_id","deals"), ("tasks_project_fk", ["project_id", "workspace_id"], "projects", ["id", "workspace_id"]), w("tasks")],
 "task_members": [p("task_members","user_id"), p("task_members","added_by"), ws("task_members","task_id","tasks"), w("task_members")],
 "task_comments": [p("task_comments","author_id"), ws("task_comments","task_id","tasks"), w("task_comments")],
 "task_attachments": [p("task_attachments","uploaded_by"), ws("task_attachments","task_id","tasks"), w("task_attachments")],
 "custom_fields": [w("custom_fields")],
 "products": [w("products")],
 "quotes": [ws("quotes","deal_id","deals"), ws("quotes","company_id","companies"), ws("quotes","contact_id","contacts"), p("quotes","created_by"), w("quotes")],
 "quote_lines": [ws("quote_lines","quote_id","quotes"), ws("quote_lines","product_id","products"), w("quote_lines")],
 "automations": [ws("automations","stage_id","pipeline_stages"), p("automations","created_by"), w("automations")],
 "push_subscriptions": [],
 "lead_forms": [p("lead_forms","owner_id"), p("lead_forms","created_by"), ("lead_forms_project_id_fkey", ["project_id"], "projects", ["id"]), w("lead_forms")],
 "email_templates": [p("email_templates","created_by"), w("email_templates")],
 "saved_views": [p("saved_views","user_id"), w("saved_views")],
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
      '      admin_workspaces_v3: { Args: never; Returns: { id: string; name: string; org_number: string | null; plan: Database["public"]["Enums"]["plan_type"]; trial_ends_at: string; contact_limit: number; discount_percent: number; discount_until: string | null; discount_note: string | null; admin_note: string | null; suspended_at: string | null; created_at: string; owner_email: string | null; owner_name: string | null; member_count: number; contact_count: number; last_activity: string | null; billing_interval: string; accounting_addon: boolean; extra_contact_packs: number }[] };',
      '      save_integration: { Args: { p_workspace: string; p_provider: string; p_credentials: string; p_company: string | null }; Returns: undefined };',
      '      integration_claim_sync: { Args: { p_workspace: string; p_provider: string }; Returns: boolean };',
      '      integration_synced: { Args: { p_workspace: string; p_provider: string; p_error: string | null }; Returns: undefined };',
      '      admin_update_packs: { Args: { p_id: string; p_packs: number }; Returns: undefined };',
      '      admin_update_billing: { Args: { p_id: string; p_interval: string; p_addon: boolean }; Returns: undefined };',
      '      accept_terms: { Args: { p_workspace: string; p_version: string }; Returns: undefined };',
      '      rotate_inbound_token: { Args: { p_workspace: string }; Returns: string };',
      '      disable_inbound: { Args: { p_workspace: string }; Returns: undefined };',
      '      inbound_try_lock: { Args: Record<string, never>; Returns: boolean };',
      '      ingest_inbound_email: { Args: { p_token: string; p_message_id: string | null; p_from_email: string; p_from_name: string | null; p_to: string[]; p_cc: string[]; p_forwarded_from: string | null; p_subject: string | null; p_body: string | null; p_sent_at: string | null }; Returns: string };',
      '      admin_wipe_workspace_data: { Args: { p_id: string; p_confirm_name: string }; Returns: string[] };',
      '      admin_delete_workspace: { Args: { p_id: string; p_confirm_name: string }; Returns: string[] };',
      '      quote_public: { Args: { p_token: string }; Returns: Json };',
      '      quote_respond: { Args: { p_token: string; p_accept: boolean; p_name: string; p_comment: string | null }; Returns: Json };',
      '      digest_claim: { Args: { p_ticket: string }; Returns: Json };',
      '      lead_submit: { Args: { p_key: string; p_data: Json; p_ip: string }; Returns: Json };',
      '      lead_form_public: { Args: { p_key: string }; Returns: Json };',
      '      brreg_claim: { Args: { p_ticket: string }; Returns: Json };',
      '      order_subscription: { Args: { p_workspace: string; p_plan: Database["public"]["Enums"]["plan_type"]; p_interval: string; p_addon: boolean; p_invoice_email: string; p_reference: string | null }; Returns: undefined };',
      '      trial_claim: { Args: { p_ticket: string }; Returns: Json };',
      '      calendar_link: { Args: { p_rotate?: boolean }; Returns: string };',
      '      calendar_feed: { Args: { p_token: string }; Returns: Json };',
      '      brreg_snapshots: { Args: { p_ticket: string; p_orgs: string[] }; Returns: Json };',
      '      brreg_apply: { Args: { p_ticket: string; p_items: Json; p_run_started: string }; Returns: number };',
      '      push_subscribe: { Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_user_agent: string | null }; Returns: undefined };',
      '      queue_push: { Args: { p_users: string[]; p_title: string; p_body: string; p_url: string; p_tag: string | null }; Returns: number };',
      '      queue_test_push: { Args: { p_title: string; p_body: string }; Returns: number };',
      '      push_claim: { Args: { p_ticket: string }; Returns: Json };',
      '      push_gone: { Args: { p_ticket: string; p_endpoints: string[] }; Returns: undefined };',
      '      my_invitations: { Args: never; Returns: { token: string; workspace_name: string; role: Database["public"]["Enums"]["member_role"]; invited_by_name: string | null }[] };',
      "    };", "    Enums: {", '      member_role: "owner" | "admin" | "user";', '      plan_type: "trial" | "start" | "bedrift" | "free";',
      "    };", "    CompositeTypes: { [_ in never]: never };", "  };", "};", "",
      'export type MemberRole = Database["public"]["Enums"]["member_role"];',
      'export type PlanType = Database["public"]["Enums"]["plan_type"];',
      'export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];', ""]
open("/home/claude/crmforalle/src/lib/database.types.ts","w").write("\n".join(o))
