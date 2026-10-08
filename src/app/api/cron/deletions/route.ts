import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { notifyDeletion, notifyTeamDeletion } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";

// Deletes companies whose 30 days after the owner's deletion request are up.
// Called by pg_cron every night with a one-time ticket; the database does the deleting.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Deleted = {
  id: string;
  name: string;
  org_number: string | null;
  plan: string;
  payment_method: string | null;
  stripe_subscription_id: string | null;
  recipients: { email: string; name: string | null }[];
};

export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  if (!/^[0-9a-f]{48}$/.test(ticket)) return new Response(null, { status: 404 });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("deletion_claim", { p_ticket: ticket });
  if (error) return new Response(null, { status: 404 });
  const items = (Array.isArray(data) ? data : []) as unknown as Deleted[];

  const stripe = getStripe();
  let mails = 0;
  for (const w of items) {
    // The renewal was already stopped when the deletion was requested; end the subscription now.
    if (stripe && w.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(w.stripe_subscription_id);
      } catch (e) {
        console.error("stripe cancel on deletion failed", e instanceof Error ? e.message : e);
      }
    }
    mails += await notifyDeletion({ kind: "workspace", workspaceName: w.name, orgNumber: w.org_number, recipients: w.recipients });
    await notifyTeamDeletion({ event: "deleted", workspaceName: w.name, orgNumber: w.org_number, plan: w.plan, paymentMethod: w.payment_method });
  }
  return Response.json({ deleted: items.length, mails });
}
