"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Notice, Select } from "@/components/ui";
import { inviteMember, updateWorkspace, type FormState } from "./actions";

export type SettingsTexts = {
  companyName: string;
  orgNr: string;
  save: string;
  saving: string;
  email: string;
  invitePlaceholder: string;
  role: string;
  roleUser: string;
  roleAdmin: string;
  invite: string;
  inviting: string;
  copy: string;
  copied: string;
  inviteLink: string;
};

export function WorkspaceForm({ name, orgNumber, t }: { name: string; orgNumber: string; t: SettingsTexts }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateWorkspace, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <div>
          <Label htmlFor="ws_name">{t.companyName}</Label>
          <Input id="ws_name" name="name" defaultValue={name} required />
        </div>
        <div>
          <Label htmlFor="ws_org">{t.orgNr}</Label>
          <Input id="ws_org" name="org_number" inputMode="numeric" defaultValue={orgNumber} />
        </div>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.message}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? t.saving : t.save}
      </Button>
    </form>
  );
}

export function InviteForm({ t }: { t: SettingsTexts }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="invite_email">{t.email}</Label>
          <Input id="invite_email" name="email" type="email" required placeholder={t.invitePlaceholder} />
        </div>
        <div>
          <Label htmlFor="invite_role">{t.role}</Label>
          <Select id="invite_role" name="role" defaultValue="user" className="w-full sm:w-auto">
            <option value="user">{t.roleUser}</option>
            <option value="admin">{t.roleAdmin}</option>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t.inviting : t.invite}
        </Button>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.link && (
        <div className="space-y-2">
          <Notice tone="success">{state.message}</Notice>
          <div className="flex gap-2">
            <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label={t.inviteLink} />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.link!);
                setCopied(true);
              }}
            >
              {copied ? t.copied : t.copy}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
