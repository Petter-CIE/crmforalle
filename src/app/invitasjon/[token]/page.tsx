import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Card, Input, Logo, Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { acceptInvitation } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.invitation.title };
}

export default async function InvitationPage({ params, searchParams }: PageProps<"/invitasjon/[token]">) {
  const { token } = await params;
  const { feil } = await searchParams;
  const { user, supabase } = await requireUser();
  const validToken = /^[0-9a-f-]{36}$/i.test(token);
  const [{ data: preview }, { data: invitedPhone }, { data: profile }] = await Promise.all([
    validToken ? supabase.rpc("invitation_preview", { p_token: token }) : Promise.resolve({ data: null }),
    validToken ? supabase.rpc("invitation_phone", { p_token: token }) : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
  ]);
  const invite = preview?.[0] ?? null;
  const { locale, t } = await getI18n();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">
            {t.invitation.title}
            {invite ? ` – ${invite.workspace_name}` : ""}
          </h1>
          <p className="mb-5 text-sm text-muted">
            {t.invitation.intro} <strong>{user.email}</strong>.
          </p>
          {feil === "epost" && (
            <div className="mb-4">
              <Notice tone="error">{t.invitation.wrongEmail}</Notice>
            </div>
          )}
          {feil === "ugyldig" && (
            <div className="mb-4">
              <Notice tone="error">{t.invitation.invalid}</Notice>
            </div>
          )}
          <form action={acceptInvitation} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            {invite && (
              <div className="space-y-1">
                <label htmlFor="inv_name" className="block text-sm font-medium">
                  {t.invitation.yourName}
                </label>
                <Input
                  id="inv_name"
                  name="full_name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  defaultValue={profile?.full_name || invite.full_name || ""}
                  className="w-full"
                />
                <p className="text-xs text-muted">{t.invitation.yourNameHelp}</p>
                <label htmlFor="inv_phone" className="block pt-2 text-sm font-medium">
                  {t.settings.phoneOptional}
                </label>
                <Input
                  id="inv_phone"
                  name="phone"
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  defaultValue={profile?.phone || invitedPhone || ""}
                  className="w-full"
                />
              </div>
            )}
            <Button type="submit" className="w-full">
              {t.invitation.join}
            </Button>
          </form>
          <form action="/auth/logg-ut" method="post" className="mt-3 text-center">
            <button type="submit" className="text-xs text-muted hover:underline">
              {t.invitation.notYou}
            </button>
          </form>
        </Card>
        <div className="flex justify-center">
          <Suspense>
            <LanguageSwitcher locale={locale} label={t.common.language} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
