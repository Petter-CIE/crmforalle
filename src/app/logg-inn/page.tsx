import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Logo, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logg inn" };

export default async function LoginPage({ searchParams }: PageProps<"/logg-inn">) {
  const params = await searchParams;
  const rawNext = typeof params.neste === "string" ? params.neste : "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  const failed = params.feil === "lenke";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center">
          <Logo />
        </Link>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">Logg inn</h1>
          <p className="mb-5 text-sm text-muted">Vi sender deg en lenke på e-post.</p>
          {failed && (
            <div className="mb-4">
              <Notice tone="error">Lenken var ugyldig eller utløpt. Be om en ny.</Notice>
            </div>
          )}
          <LoginForm next={next} />
        </Card>
      </div>
    </main>
  );
}
