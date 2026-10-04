import type { Metadata } from "next";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { logoUrl } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "./lead-form";

type PublicForm = {
  name: string;
  title: string | null;
  intro: string | null;
  button_text: string | null;
  thank_you: string | null;
  ask_phone: boolean;
  ask_company: boolean;
  require_message: boolean;
  workspace: string;
  logo_path: string | null;
};

async function load(key: string) {
  if (!/^[0-9a-f]{36}$/.test(key)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("lead_form_public", { p_key: key });
  return (data as PublicForm | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/skjema/[key]">): Promise<Metadata> {
  const { key } = await params;
  const f = await load(key);
  const { t } = await getI18n();
  return { title: f ? `${f.title || t.leads.defaultTitle} · ${f.workspace}` : t.leads.notFound, robots: { index: false } };
}

/** Public contact form (also embedded on customers' websites with ?embed=1). */
export default async function LeadFormPage({ params, searchParams }: PageProps<"/skjema/[key]">) {
  const { key } = await params;
  const sp = await searchParams;
  const embed = sp.embed === "1";
  const { t } = await getI18n();
  const l = t.leads;
  const f = await load(key);

  const shell = (children: React.ReactNode) =>
    embed ? (
      <main className="w-full p-1">
        <style>{"html,body{background:transparent!important}"}</style>
        {children}
      </main>
    ) : (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">{children}</div>
      </main>
    );

  if (!f) return shell(<p className="text-center text-sm text-muted">{l.notFound}</p>);

  const logo = logoUrl(f.logo_path);
  return shell(
    <>
      {!embed && (
        <header className="mb-5 space-y-2">
          {logo ? (
            <Image src={logo} alt={f.workspace} width={200} height={48} unoptimized style={{ width: "auto", height: "auto" }} className="h-auto max-h-12 w-auto max-w-48 object-contain" />
          ) : (
            <p className="text-sm font-semibold text-brand">{f.workspace}</p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{f.title || l.defaultTitle}</h1>
          {f.intro && <p className="whitespace-pre-line text-sm text-muted">{f.intro}</p>}
        </header>
      )}
      {embed && f.intro && <p className="mb-4 whitespace-pre-line text-sm text-muted">{f.intro}</p>}
      <LeadForm
        formKey={key}
        embed={embed}
        initialSent={sp.sendt === "1"}
        initialError={typeof sp.feil === "string" ? sp.feil : null}
        config={{ askPhone: f.ask_phone, askCompany: f.ask_company, requireMessage: f.require_message }}
        t={{
          name: l.name,
          email: l.email,
          phone: l.phone,
          company: l.company,
          message: l.message,
          send: f.button_text || l.send,
          sending: l.sending,
          thanks: f.thank_you || l.defaultThanks,
          errInvalid: l.errInvalid,
          errRate: l.errRate,
          errGeneric: l.errGeneric,
          privacy: l.privacy,
          poweredBy: l.poweredBy,
        }}
      />
    </>,
  );
}
