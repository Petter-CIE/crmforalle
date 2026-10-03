"use client";

import { useRef } from "react";
import { SearchSelect, type SearchKind } from "@/components/search-select";

/** Search field that submits its form as soon as something is picked (e.g. "add contact to project"). */
export function PickAndSubmit({
  action,
  hidden,
  field,
  kind,
  exclude,
  placeholder,
  emptyText,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  field: string;
  kind: SearchKind;
  exclude?: string[];
  placeholder: string;
  emptyText: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const value = useRef<HTMLInputElement>(null);
  return (
    <form ref={form} action={action} className="mt-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input ref={value} type="hidden" name={field} />
      <SearchSelect
        kind={kind}
        placeholder={placeholder}
        emptyText={emptyText}
        exclude={exclude}
        clearOnPick
        onPick={(item) => {
          if (!value.current || !form.current) return;
          value.current.value = item.id;
          form.current.requestSubmit();
        }}
      />
    </form>
  );
}
