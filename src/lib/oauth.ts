import "server-only";

// "Sign in with Microsoft / Google". A provider is shown when it is switched on in
// Supabase → Authentication → Providers (read from the public auth settings, cached for 5 minutes).
export type OAuthProvider = "azure" | "google";

export async function enabledOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const s = (await res.json()) as { external?: Record<string, boolean> };
    return (["azure", "google"] as const).filter((p) => s.external?.[p]);
  } catch {
    return [];
  }
}
