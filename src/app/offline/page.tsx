import type { Metadata } from "next";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Offline" };

// Static page cached by the service worker and shown when there is no connection.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo />
      <h1 className="text-xl font-semibold">Ingen nettforbindelse</h1>
      <p className="max-w-sm text-sm text-muted">
        AllSeats trenger internett for å vise kundene dine. Sjekk forbindelsen og prøv igjen.
        <br />
        <span className="mt-2 block">No connection – check your network and try again.</span>
      </p>
      <a href="/app" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
        Prøv igjen / Try again
      </a>
    </main>
  );
}
