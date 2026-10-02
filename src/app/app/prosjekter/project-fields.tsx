import { Input, Select } from "@/components/ui";
import { Field, Textarea } from "@/components/ui-extra";
import { PROJECT_COLORS } from "@/lib/crm";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ProjectFields({
  t,
  initial,
  members,
  me,
}: {
  t: Dictionary;
  initial?: { name: string; description: string | null; color: string; owner_id: string | null };
  members: { id: string; name: string }[];
  me: string;
}) {
  return (
    <>
      <Field label={`${t.projects.name} *`} htmlFor="p_name">
        <Input id="p_name" name="name" required defaultValue={initial?.name} />
      </Field>
      <Field label={t.projects.description} htmlFor="p_desc">
        <Textarea id="p_desc" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </Field>
      {members.length > 1 && (
        <Field label={t.projects.owner} htmlFor="p_owner">
          <Select id="p_owner" name="owner_id" defaultValue={initial ? (initial.owner_id ?? "") : me} className="w-full">
            {initial && !initial.owner_id && <option value="">{t.projects.noOwner}</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t.projects.color}</legend>
        <div className="flex gap-2">
          {Object.entries(PROJECT_COLORS).map(([key, cls]) => (
            <label key={key} className="cursor-pointer">
              <input type="radio" name="color" value={key} defaultChecked={(initial?.color ?? "green") === key} className="peer sr-only" />
              <span className={`block h-7 w-7 rounded-full ${cls} ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2`} />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
