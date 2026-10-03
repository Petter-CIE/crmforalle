import { Input, Select } from "@/components/ui";
import { formatCustomValue, type CustomField, type CustomValues } from "@/lib/custom-fields";

/** Inputs for a record's custom fields (names cf_<id>). Works inside server and client forms. */
export function CustomFieldInputs({
  fields,
  values,
  t,
}: {
  fields: CustomField[];
  values: CustomValues;
  t: { choose: string; title: string };
}) {
  if (fields.length === 0) return null;
  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">{t.title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `cf_${f.id}`;
          const v = values[f.id];
          if (f.type === "checkbox") {
            return (
              <label key={f.id} className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                <input type="checkbox" id={id} name={id} value="1" defaultChecked={v === true} />
                {f.label}
              </label>
            );
          }
          return (
            <div key={f.id}>
              <label htmlFor={id} className="mb-1 block text-sm font-medium">
                {f.label}
              </label>
              {f.type === "select" ? (
                <Select id={id} name={id} defaultValue={typeof v === "string" ? v : ""} className="w-full">
                  <option value="">{t.choose}</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={id}
                  name={id}
                  type={f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  defaultValue={v === undefined || typeof v === "boolean" ? "" : String(v)}
                />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Read-only list of the filled-in custom fields of a record. */
export function CustomFieldValues({
  fields,
  values,
  dateLocale,
  yes,
}: {
  fields: CustomField[];
  values: CustomValues;
  dateLocale: string;
  yes: string;
}) {
  const filled = fields
    .map((f) => ({ f, text: formatCustomValue(f, values[f.id], dateLocale, yes) }))
    .filter((x) => x.text);
  if (filled.length === 0) return null;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {filled.map(({ f, text }) => (
        <div key={f.id} className="min-w-0">
          <dt className="text-xs text-muted">{f.label}</dt>
          <dd className="break-words">
            {f.type === "url" ? (
              <a href={text} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                {text.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              text
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
