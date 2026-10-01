import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Stateless Supabase client for sending login e-mails to *other* people
 * (e.g. invitations). It never touches the current user's cookies/session.
 * Requires the e-mail templates to use token_hash links (see docs/auth-email-templates.md).
 */
export function createMailerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" } },
  );
}
