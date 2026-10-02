"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type SecurityTexts = {
  enabled: string;
  disabled: string;
  enable: string;
  disable: string;
  scanQr: string;
  enterCode: string;
  confirm: string;
  cancel: string;
  enabledOk: string;
  disabledOk: string;
  needAal2: string;
  addPasskey: string;
  adding: string;
  noPasskeys: string;
  created: string;
  lastUsed: string;
  remove: string;
  passkeyAdded: string;
  passkeyFailed: string;
  unsupported: string;
  error: string;
  invalidCode: string;
};

type Msg = { tone: "success" | "error"; text: string } | null;

/** Optional TOTP two-step verification (authenticator app). */
export function TotpSection({ t }: { t: SecurityTexts }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const refresh = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load factors from Supabase on mount
    void refresh();
  }, [refresh]);

  async function start() {
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    // Remove half-finished enrollments so a new one can be created.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator", issuer: "AllSeats CRM" });
    setBusy(false);
    if (error || !data) return setMsg({ tone: "error", text: t.error });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enroll) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: t.invalidCode });
    setEnroll(null);
    setCode("");
    setMsg({ tone: "success", text: t.enabledOk });
    await refresh();
    router.refresh();
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: error.code === "insufficient_aal" ? t.needAal2 : t.error });
    setMsg({ tone: "success", text: t.disabledOk });
    await refresh();
    router.refresh();
  }

  if (!loaded) return <p className="text-sm text-muted">…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${factorId ? "bg-brand-soft text-brand" : "bg-background text-muted"}`}
        >
          {factorId ? t.enabled : t.disabled}
        </span>
        {!enroll &&
          (factorId ? (
            <Button variant="danger" onClick={disable} disabled={busy}>
              {t.disable}
            </Button>
          ) : (
            <Button variant="secondary" onClick={start} disabled={busy}>
              {t.enable}
            </Button>
          ))}
      </div>

      {enroll && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm">{t.scanQr}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URI from Supabase */}
          <img
            src={enroll.qr.startsWith("data:") ? enroll.qr : `data:image/svg+xml;utf-8,${encodeURIComponent(enroll.qr)}`}
            alt="QR"
            width={180}
            height={180}
            className="rounded bg-white p-2"
          />
          <code className="block break-all rounded bg-background px-2 py-1 text-xs">{enroll.secret}</code>
          <div>
            <Label htmlFor="totp_code">{t.enterCode}</Label>
            <div className="flex gap-2">
              <Input
                id="totp_code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="max-w-[10rem] tracking-[0.3em]"
              />
              <Button onClick={verify} disabled={busy || code.replace(/\s/g, "").length !== 6}>
                {t.confirm}
              </Button>
              <Button variant="ghost" onClick={() => setEnroll(null)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}

type PasskeyItem = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

/** Passkeys: Windows Hello, Face ID, Touch ID, Android fingerprint, security keys. */
const noSubscribe = () => () => {};

export function PasskeySection({ t, dateLocale }: { t: SecurityTexts; dateLocale: string }) {
  const [items, setItems] = useState<PasskeyItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  // Server render assumes support; the client value is read after hydration (avoids a mismatch).
  const supported = useSyncExternalStore(
    noSubscribe,
    () => "PublicKeyCredential" in window,
    () => true,
  );

  const refresh = useCallback(async () => {
    const { data } = await createClient().auth.passkey.list();
    setItems((data as PasskeyItem[] | null) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load passkeys from Supabase on mount
    void refresh();
  }, [refresh]);

  async function add() {
    setMsg(null);
    setBusy(true);
    const { error } = await createClient().auth.registerPasskey();
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: t.passkeyFailed });
    setMsg({ tone: "success", text: t.passkeyAdded });
    await refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const { error } = await createClient().auth.passkey.delete({ passkeyId: id });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: t.error });
    await refresh();
  }

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(dateLocale) : "");

  return (
    <div className="space-y-4">
      {items === null ? (
        <p className="text-sm text-muted">…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{t.noPasskeys}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
              <span aria-hidden>🔑</span>
              <span className="flex-1 truncate">{p.friendly_name || "Passkey"}</span>
              <span className="text-xs text-muted">
                {t.created} {fmt(p.created_at)}
                {p.last_used_at ? ` · ${t.lastUsed} ${fmt(p.last_used_at)}` : ""}
              </span>
              <Button variant="danger" className="!px-2 text-xs" onClick={() => remove(p.id)} disabled={busy}>
                {t.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <Button variant="secondary" onClick={add} disabled={busy}>
          {busy ? t.adding : t.addPasskey}
        </Button>
      ) : (
        <Notice>{t.unsupported}</Notice>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
