// Generated from Supabase (project crmforalle). Regenerate after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = "owner" | "admin" | "user";
export type PlanType = "trial" | "start" | "bedrift";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: MemberRole;
          token: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: MemberRole;
          token?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: MemberRole;
          token?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          role: MemberRole;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role?: MemberRole;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: MemberRole;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          locale: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          locale?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          contact_limit: number;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          org_number: string | null;
          plan: PlanType;
          stripe_customer_id: string | null;
          trial_ends_at: string;
        };
        Insert: {
          contact_limit?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          org_number?: string | null;
          plan?: PlanType;
          stripe_customer_id?: string | null;
          trial_ends_at?: string;
        };
        Update: {
          contact_limit?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          org_number?: string | null;
          plan?: PlanType;
          stripe_customer_id?: string | null;
          trial_ends_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      create_workspace: {
        Args: { p_name: string; p_org_number?: string };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
      plan_type: PlanType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
