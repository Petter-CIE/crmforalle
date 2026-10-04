import { Input, Select } from "@/components/ui";
import { Field, Textarea } from "@/components/ui-extra";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type LeadFormValues = {
  name: string;
  owner_id: string | null;
  project_id: string | null;
  create_deal: boolean;
  create_task: boolean;
  ask_phone: boolean;
  ask_company: boolean;
  require_message: boolean;
  title: string | null;
  intro: string | null;
  button_text: string | null;
  thank_you: string | null;
  active?: boolean;
};

const check = (name: string, label: string, on: boolean) => (
  <label key={name} className="flex items-center gap-2 text-sm">
    <input type="checkbox" name={name} value="1" defaultChecked={on} className="h-4 w-4 accent-[var(--brand)]" />
    {label}
  </label>
);

/** Settings for one web form (used by "new" and "edit"). */
export function LeadFormFields({
  v,
  members,
  projects,
  t,
}: {
  v: LeadFormValues;
  members: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  t: Dictionary["leads"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.formName} htmlFor="lf_name">
          <Input id="lf_name" name="name" required maxLength={80} defaultValue={v.name} placeholder={t.formNamePlaceholder} />
        </Field>
        <Field label={t.owner} htmlFor="lf_owner">
          <Select id="lf_owner" name="owner_id" defaultValue={v.owner_id ?? ""} className="w-full">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.project} htmlFor="lf_project">
          <Select id="lf_project" name="project_id" defaultValue={v.project_id ?? ""} className="w-full">
            <option value="">{t.noProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {check("create_deal", t.createDeal, v.create_deal)}
        {check("create_task", t.createTask, v.create_task)}
        {check("ask_phone", t.askPhone, v.ask_phone)}
        {check("ask_company", t.askCompany, v.ask_company)}
        {check("require_message", t.requireMessage, v.require_message)}
        {v.active !== undefined && check("active", t.active, v.active)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.heading} htmlFor="lf_title">
          <Input id="lf_title" name="title" maxLength={120} defaultValue={v.title ?? ""} placeholder={t.headingPlaceholder} />
        </Field>
        <Field label={t.buttonText} htmlFor="lf_button">
          <Input id="lf_button" name="button_text" maxLength={40} defaultValue={v.button_text ?? ""} placeholder={t.send} />
        </Field>
        <Field label={t.introText} htmlFor="lf_intro">
          <Textarea id="lf_intro" name="intro" rows={2} maxLength={1000} defaultValue={v.intro ?? ""} placeholder={t.introPlaceholder} />
        </Field>
        <Field label={t.thankYou} htmlFor="lf_thanks">
          <Textarea id="lf_thanks" name="thank_you" rows={2} maxLength={1000} defaultValue={v.thank_you ?? ""} placeholder={t.defaultThanks} />
        </Field>
      </div>
    </div>
  );
}
