"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Input, Notice } from "@/components/ui";
import { connectTripletex, disconnectTripletex, syncAccountingNow, type AccountingState } from "./accounting-actions";

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
};

export function AccountingCard({
  t,
  connected,
  manager,
  allowed,
}: {
  t: AccountingTexts;
  connected: { company: string | null; lastSync: string | null; error: boolean } | null;
  manager: boolean;
  allowed: boolean;
}) {
  const [state, connectAction, connecting] = useActionState<AccountingState, FormData>(connectTripletex, {});
  const [syncState, setSyncState] = useState<AccountingState>({});
  const [syncing, startSync] = useTransition();

  if (!allowed) return <p className="text-sm text-muted">{t.notIncluded}</p>;

  if (connected) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
          <span className="font-medium">{t.connectedTo.replace("{company}", connected.company ?? t.tripletex)}</span>
        </p>
        <p className="text-muted">{connected.lastSync ? t.lastSync.replace("{when}", connected.lastSync) : t.neverSynced}</p>
        {connected.error && <Notice tone="error">{t.syncError}</Notice>}
        {(syncState.message || syncState.error || state.message) && (
          <Notice tone={syncState.error ? "error" : "success"}>{syncState.error ?? syncState.message ?? state.message}</Notice>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={syncing}
            onClick={() => startSync(async () => setSyncState(await syncAccountingNow()))}
          >
            {syncing ? t.syncing : t.syncNow}
          </Button>
          {manager && (
            <form
              action={disconnectTripletex}
              onSubmit={(e) => {
                if (!window.confirm(t.confirmDisconnect)) e.preventDefault();
              }}
            >
              <Button type="submit" variant="danger">
                {t.disconnect}
              </Button>
            </form>
          )}
        </div>
        <p className="text-xs text-muted">
          {t.autoSync} {t.overdueNote}
        </p>
      </div>
    );
  }

  if (!manager) return <p className="text-sm text-muted">{t.onlyAdmins}</p>;

  return (
    <form action={connectAction} className="space-y-3 text-sm">
      <p className="text-muted">{t.intro}</p>
      <label htmlFor="tt_token" className="block font-medium">
        {t.tripletex} – {t.tokenLabel}
      </label>
      <Input id="tt_token" name="token" type="password" autoComplete="off" required minLength={20} />
      <p className="text-xs text-muted">{t.tokenHelp}</p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={connecting}>
        {connecting ? t.connecting : t.connect}
      </Button>
      <p className="text-xs text-muted">{t.soon}</p>
    </form>
  );
}
