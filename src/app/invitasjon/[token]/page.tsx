import type { Metadata } from "next";
import { Button, Card, Logo, Notice } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { acceptInvitation } from "./actions";

export const metadata: Metadata = { title: "Invitasjon" };

export default async function InvitationPage({ params, searchParams }: PageProps<"/invitasjon/[token]">) {
  const { token } = await params;
  const { feil } = await searchParams;
  const { user } = await requireUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo />
        </div>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">Du er invitert</h1>
          <p className="mb-5 text-sm text-muted">
            Bli med i bedriftens CRM som <strong>{user.email}</strong>.
          </p>
          {feil === "epost" && (
            <div className="mb-4">
              <Notice tone="error">
                Invitasjonen ble sendt til en annen e-postadresse. Logg inn med den adressen invitasjonen gjelder.
              </Notice>
            </div>
          )}
          {feil === "ugyldig" && (
            <div className="mb-4">
              <Notice tone="error">Invitasjonen er ugyldig, allerede brukt eller utløpt. Be om en ny.</Notice>
            </div>
          )}
          <form action={acceptInvitation} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Bli med
            </Button>
          </form>
          <form action="/auth/logg-ut" method="post" className="mt-3 text-center">
            <button type="submit" className="text-xs text-muted hover:underline">
              Ikke deg? Logg ut
            </button>
          </form>
        </Card>
      </div>
    </main>
  );
}
