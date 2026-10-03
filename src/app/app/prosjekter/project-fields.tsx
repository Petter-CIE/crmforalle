import { Input, Select } from "@/components/ui";
import { Field, Textarea } from "@/components/ui-extra";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ColorPicker } from "./color-picker";

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
      <ColorPicker initial={initial?.color ?? "green"} legend={t.projects.color} customLabel={t.projects.customColor} />
    </>
  );
}
