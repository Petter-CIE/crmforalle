"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Input, Notice, Select } from "@/components/ui";
import {
  chooseFikenCompany,
  connectTripletex,
  disconnectFiken,
  disconnectTripletex,
  syncAccountingNow,
  type AccountingState,
} from "./accounting-actions";

export type AccountingTexts = {
  intro: string;
  tripletex: string;
  soon: string;
  tokenLabel: string;
  tokenHelp: string;
  connect: string;
  connecting: string;
  connectedTo: string;
  lastSync: string;
  neverSynced: string;
  syncError: string;
  syncNow: string;
  syncing: string;
  autoSync: string;
  disconnect: string;
  confirmDisconnect: string;
  overdueNote: string;
  notIncluded: string;
  onlyAdmins: string;
  fiken: string;
  fikenIntro: string;
  fikenConnect: string;
  fikenChoose: string;
  fikenChooseButton: string;
  fikenNoApiTag: string;
  fikenNoApi: string;
  confirmDisconnectFiken: string;
  fikenAccessNote: string;
  fikenNotReady: string;
};

type Connection = { company: string | null; lastSync: string | null; error: string | null };
type FikenCompanyOption = { slug: string; name: string; hasApi: boolean };

function Status({ t, name, c }: { t: AccountingTexts; name: string; c: Connection }) {
  return (
    <>
      <p>
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
        <span className="font-medium">{t.connectedTo.replace("{company}", c.company || name)}</span>
        <span className="text-muted"> · {name}</span>
      </p>
      <p className="text-muted">{c.lastSync ? t.lastSync.replace("{when}", c.lastSync) : t.neverSynced}</p>
      {c.error && <Notice tone="error">{c.error === "fiken_403" ? t.fikenNoApi : t.syncError}</Notice>}
    </>
  );
}

function Disconnect({ action, confirm, label }: { action: () => Promise<void>; confirm: string; label: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="danger">
        {label}
      </Button>
    </form>
  );
}

function FikenChooser({ t, companies }: { t: AccountingTexts; companies: FikenCompanyOption[] }) {
  const [state, action, pending] = useActionState<AccountingState, FormData>(chooseFikenCompany, {});
  return (
    <form action={action} className="space-y-2">
      <p>{t.fikenChoose}</p>
      <Select name="slug" required defaultValue={companies.find((c) => c.hasApi)?.slug ?? companies[0]?.slug}>
        {companies.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
            {c.hasApi ? "" : ` (${t.fikenNoApiTag})`}
          </option>
        ))}
      </Select>
      {(state.error || state.message) && <Notice tone={state.error ? "error" : "success"}>{state.error ?? state.message}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? t.connecting : t.fikenChooseButton}
      </Button>
    </form>
  );
}

export function AccountingCard({
  t,
  tripletex,
  fiken,
  fikenCompanies,
  fikenReady,
  flash,
  manager,
  allowed,
}: {
  t: AccountingTexts;
  tripletex: Connection | null;
  fiken: Connection | null;
  /** Set when Fiken is connected but no company is chosen yet. */
  fikenCompanies: FikenCompanyOption[] | null;
  fikenReady: boolean;
  flash: { tone: "success" | "error"; text: string } | null;
  manager: boolean;
  allowed: boolean;
}) {
  const [state, connectAction, connecting] = useActionState<AccountingState, FormData>(connectTripletex, {});
  const [syncState, setSyncState] = useState<AccountingState>({});
  const [syncing, startSync] = useTransition();

  if (!allowed) return <p className="text-sm text-muted">{t.notIncluded}</p>;

  const fikenPending = !!fiken && !!fikenCompanies;
  const anySynced = !!tripletex || (!!fiken && !fikenPending);
  const message = syncState.error ?? syncState.message ?? state.message;

  return (
    <div className="space-y-5 text-sm">
      {!tripletex && !fiken && <p className="text-muted">{t.intro}</p>}
      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}

      {/* --- Tripletex --- */}
      {tripletex ? (
        <div className="space-y-2">
          <Status t={t} name={t.tripletex} c={tripletex} />
          {manager && <Disconnect action={disconnectTripletex} confirm={t.confirmDisconnect} label={`${t.disconnect} ${t.tripletex}`} />}
        </div>
      ) : (
        !fiken &&
        manager && (
          <form action={connectAction} className="space-y-3">
            <label htmlFor="tt_token" className="block font-medium">
              {t.tripletex} – {t.tokenLabel}
            </label>
            <Input id="tt_token" name="token" type="password" autoComplete="off" required minLength={20} />
            <p className="text-xs text-muted">{t.tokenHelp}</p>
            {state.error && <Notice tone="error">{state.error}</Notice>}
            <Button type="submit" disabled={connecting}>
              {connecting ? t.connecting : `${t.connect} ${t.tripletex}`}
            </Button>
          </form>
        )
      )}

      {/* --- Fiken --- */}
      {fiken ? (
        <div className="space-y-2">
          {fikenPending ? (
            manager ? <FikenChooser t={t} companies={fikenCompanies!} /> : <p className="text-muted">{t.onlyAdmins}</p>
          ) : (
            <Status t={t} name={t.fiken} c={fiken} />
          )}
          {manager && <Disconnect action={disconnectFiken} confirm={t.confirmDisconnectFiken} label={`${t.disconnect} ${t.fiken}`} />}
          {!fikenPending && <p className="text-xs text-muted">{t.fikenAccessNote}</p>}
        </div>
      ) : (
        !tripletex &&
        manager && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="font-medium">{t.fiken}</p>
            <p className="text-xs text-muted">{t.fikenIntro}</p>
            {fikenReady ? (
              <a
                href="/api/integrations/fiken/start"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 font-medium hover:bg-background"
              >
                {t.fikenConnect}
              </a>
            ) : (
              <p className="text-xs text-muted">{t.fikenNotReady}</p>
            )}
          </div>
        )
      )}

      {!tripletex && !fiken && !manager && <p className="text-muted">{t.onlyAdmins}</p>}
      {!tripletex && !fiken && <p className="text-xs text-muted">{t.soon}</p>}

      {anySynced && (
        <div className="space-y-2">
          {message && <Notice tone={syncState.error ? "error" : "success"}>{message}</Notice>}
          <Button type="button" variant="secondary" disabled={syncing} onClick={() => startSync(async () => setSyncState(await syncAccountingNow()))}>
            {syncing ? t.syncing : t.syncNow}
          </Button>
          <p className="text-xs text-muted">
            {t.autoSync} {t.overdueNote}
          </p>
        </div>
      )}
    </div>
  );
}
