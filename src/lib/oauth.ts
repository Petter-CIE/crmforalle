// "Sign in with Microsoft / Google". A provider is shown only when it is switched on in the
// environment (after it is configured in Supabase → Authentication → Providers).
export type OAuthProvider = "azure" | "google";

export function enabledOAuthProviders(): OAuthProvider[] {
  const out: OAuthProvider[] = [];
  if (process.env.AUTH_MICROSOFT === "1") out.push("azure");
  if (process.env.AUTH_GOOGLE === "1") out.push("google");
  return out;
}
