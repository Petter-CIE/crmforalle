import { contactName } from "@/lib/crm";
import { requireWorkspace } from "@/lib/session";

/**
 * Everything stored about one contact, as a JSON file – for a person's right of access (GDPR art. 15)
 * and data portability (art. 20). Members can download it for contacts in their own company.
 */
export async function GET(_req: Request, ctx: RouteContext<"/app/kontakter/[id]/gdpr">) {
  const { id } = await ctx.params;
  const { supabase, workspace } = await requireWorkspace();
  const ws = workspace.id;
  const { data: k } = await supabase.from("contacts").select("*, companies(name, org_number)").eq("id", id).eq("workspace_id", ws).maybeSingle();
  if (!k) return new Response("Not found", { status: 404 });

  const [fields, deals, tasks, activities, quotes, projects] = await Promise.all([
    supabase.from("custom_fields").select("id, label").eq("workspace_id", ws).eq("entity", "contact"),
    supabase.from("deals").select("title, value, currency, created_at, closed_at, pipeline_stages(name)").eq("contact_id", id).eq("workspace_id", ws),
    supabase.from("tasks").select("title, description, due_at, done_at, created_at").eq("contact_id", id).eq("workspace_id", ws),
    supabase.from("activities").select("type, body, occurred_at").eq("contact_id", id).eq("workspace_id", ws).order("occurred_at"),
    supabase.from("quotes").select("number, title, status, total, sent_at, responded_at, responder_name").eq("contact_id", id).eq("workspace_id", ws),
    supabase.from("project_contacts").select("projects(name)").eq("contact_id", id).eq("workspace_id", ws),
  ]);
  const label = new Map((fields.data ?? []).map((f) => [f.id, f.label]));
  const custom = Object.fromEntries(Object.entries((k.custom as Record<string, unknown>) ?? {}).map(([fid, v]) => [label.get(fid) ?? fid, v]));

  const doc = {
    about: {
      description: "Personopplysninger registrert i AllSeats CRM / Personal data stored in AllSeats CRM",
      controller: `${workspace.name}${workspace.org_number ? ` (org.nr. ${workspace.org_number})` : ""}`,
      processor: "CIE AS (AllSeats CRM), org.nr. 818 823 452",
      exported_at: new Date().toISOString(),
    },
    person: {
      name: contactName(k),
      first_name: k.first_name,
      last_name: k.last_name,
      title: k.title,
      email: k.email,
      phone: k.phone,
      address: k.address,
      postal_code: k.postal_code,
      city: k.city,
      company: k.companies ? { name: k.companies.name, org_number: k.companies.org_number } : null,
      marketing_consent: k.marketing_consent,
      marketing_consent_at: k.marketing_consent_at,
      notes: k.notes,
      custom_fields: custom,
      created_at: k.created_at,
      updated_at: k.updated_at,
    },
    deals: (deals.data ?? []).map((d) => ({ title: d.title, value: d.value, currency: d.currency, stage: d.pipeline_stages?.name ?? null, created_at: d.created_at, closed_at: d.closed_at })),
    quotes: quotes.data ?? [],
    tasks: tasks.data ?? [],
    history: activities.data ?? [],
    projects: (projects.data ?? []).map((p) => p.projects?.name).filter(Boolean),
  };
  const file = `personopplysninger-${contactName(k).toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "") || "kontakt"}.json`;
  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file)}`,
      "cache-control": "no-store",
    },
  });
}
