"use server";

import { redirect } from "next/navigation";
import { enabledOAuthProviders, type OAuthProvider } from "@/lib/oauth";
import { safeNext, siteUrl } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Starts "Sign in with Microsoft / Google". New users go on to set up their company like after registering. */
export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as OAuthProvider;
  const next = safeNext(formData.get("neste"));
  if (!(await enabledOAuthProviders()).includes(provider)) redirect("/logg-inn");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl()}/auth/callback?neste=${encodeURIComponent(next)}`,
      // Microsoft only returns the e-mail address with this scope; Google lets people pick an account.
      ...(provider === "azure" ? { scopes: "email openid profile" } : { queryParams: { prompt: "select_account" } }),
    },
  });
  if (error || !data.url) redirect("/logg-inn?feil=oauth");
  redirect(data.url);
}
