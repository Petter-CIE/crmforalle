"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button, Input, Notice, Select } from "@/components/ui";
import { Textarea } from "@/components/ui-extra";
import { renderCampaign } from "@/lib/campaign-render";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { previewAudience, saveCampaign, sendCampaign, sendTestCampaign, type Audience, type CampaignState } from "../actions";

type Option = { id: string; name: string };

export function CampaignEditor({
  campaign,
  projects,
  owners,
  company,
  locale,
}: {
  campaign: { id: string; name: string; subject: string; body: string; audience: Audience };
  projects: Option[];
  owners: Option[];
  company: { name: string; address: string | null };
  locale: Locale;
}) {
  // Texts are looked up here: the dictionary holds functions, which cannot be passed from a server component.
  const t = dictionaries[locale].campaigns;
  const [subject, setSubject] = useState(campaign.subject);
  const [body, setBody] = useState(campaign.body);
  const [aud, setAud] = useState<Audience>({
    kind: campaign.audience.kind ?? "",
    project_id: campaign.audience.project_id ?? "",
    owner_id: campaign.audience.owner_id ?? "",
    consent_only: campaign.audience.consent_only ?? false,
  });
  const [numbers, setNumbers] = useState<{ count: number; quota: number; used: number } | null>(null);
  const [, startCounting] = useTransition();
  const [, startSubmit] = useTransition();
  const [saveState, saveAction, saving] = useActionState<CampaignState, FormData>(saveCampaign, {});
  const [testState, testAction, testing] = useActionState<CampaignState, FormData>(sendTestCampaign, {});
  const [sendState, sendAction, sending] = useActionState<CampaignState, FormData>(sendCampaign, {});

  // Recount the recipients whenever the selection changes.
  useEffect(() => {
    const timer = setTimeout(() => startCounting(async () => setNumbers(await previewAudience(aud))), 250);
    return () => clearTimeout(timer);
  }, [aud]);

  const preview = useMemo(
    () =>
      renderCampaign(
        subject || "—",
        body || "…",
        { first_name: "Kari", last_name: "Nordmann", company_name: "Eksempel AS" },
        { company: company.name, address: company.address, unsubscribeUrl: "#", unsubscribeLabel: "Meld deg av", why: "Du får denne e-posten fra" },
      ),
    [subject, body, company],
  );

  const left = numbers ? Math.max(0, numbers.quota - numbers.used) : null;
  const state = sendState.error ? sendState : testState.error || testState.message ? testState : saveState;
  const busy = saving || testing || sending;

  // Submitted by hand instead of through form actions: React resets a form after a form action, which put the
  // controlled recipient selects back to "Alle" on screen while the saved choice was different.
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    const intent = submitter?.value;
    startSubmit(() => (intent === "test" ? testAction : intent === "send" ? sendAction : saveAction)(fd));
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="id" value={campaign.id} />
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.name}</span>
          <Input name="name" defaultValue={campaign.name} maxLength={120} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.subject}</span>
          <Input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.body}</span>
          <Textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} maxLength={20000} />
          <span className="mt-1 block text-xs text-muted">{t.bodyHelp}</span>
        </label>

        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">{t.audience}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t.kind}</span>
              <Select name="kind" value={aud.kind} onChange={(e) => setAud({ ...aud, kind: e.target.value as Audience["kind"] })} className="w-full">
                <option value="">{t.kindAll}</option>
                <option value="b2b">{t.kindB2b}</option>
                <option value="b2c">{t.kindB2c}</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t.project}</span>
              <Select name="project_id" value={aud.project_id} onChange={(e) => setAud({ ...aud, project_id: e.target.value })} className="w-full">
                <option value="">{t.allProjects}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t.owner}</span>
              <Select name="owner_id" value={aud.owner_id} onChange={(e) => setAud({ ...aud, owner_id: e.target.value })} className="w-full">
                <option value="">{t.allOwners}</option>
                {owners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="consent_only"
              value="1"
              checked={aud.consent_only ?? false}
              onChange={(e) => setAud({ ...aud, consent_only: e.target.checked })}
            />
            {t.consentOnly}
          </label>
          <p className="text-lg font-semibold">
            {numbers ? t.count(numbers.count) : "…"}
            {left !== null && <span className="ml-2 text-sm font-normal text-muted">· {t.quotaLeft(left)}</span>}
          </p>
          <p className="text-xs text-muted">{t.rules}</p>
        </fieldset>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        {!state.error && state.message && <Notice>{state.message}</Notice>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="intent" value="save" variant="secondary" disabled={busy}>
            {t.save}
          </Button>
          <Button type="submit" name="intent" value="test" variant="secondary" disabled={busy}>
            {t.sendTest}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="send"
            disabled={busy || !numbers || numbers.count === 0}
            onClick={(e) => {
              if (!confirm(t.confirmSend(numbers?.count ?? 0))) e.preventDefault();
            }}
          >
            {t.send}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t.preview}</p>
        <p className="text-xs text-muted">{t.previewNote}</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <p className="border-b border-border bg-surface px-4 py-2 text-sm">
            <span className="text-muted">{t.subject}:</span> <span className="font-medium">{preview.subject}</span>
          </p>
          <iframe title={t.preview} srcDoc={preview.html} sandbox="" className="h-[560px] w-full bg-white" />
        </div>
      </div>
    </form>
  );
}
