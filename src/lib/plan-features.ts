import type { PlanType } from "@/lib/database.types";

// What each plan includes. Mirrors private.has_team_features / private.has_outlook in the database.
// Start: one pipeline, no automations, no project-limited users; Outlook and accounting are add-ons.
// Bedrift, the free trial and the free plan include everything.

/** Several pipelines, automations and users limited to projects. */
export function hasTeamFeatures(plan: PlanType) {
  return plan === "bedrift" || plan === "trial" || plan === "free";
}

/** Outlook / Microsoft 365 mail and calendar sync. */
export function hasOutlook(w: { plan: PlanType; outlook_addon?: boolean | null }) {
  return hasTeamFeatures(w.plan) || (w.plan === "start" && !!w.outlook_addon);
}
