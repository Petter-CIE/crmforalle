"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { bulkEdit, type BulkState } from "@/app/app/bulk-actions";

export type BulkTexts = {
  selected: string;
  clear: string;
  chooseAction: string;
  addToProject: string;
  removeFromProject: string;
  setOwner: string;
  noOwner: string;
  delete: string;
  apply: string;
  chooseProject: string;
  confirmDelete: string;
  selectAll: string;
  selectRow: string;
};

type Option = { id: string; name: string };

const boxes = (formId: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name=ids][form="${formId}"]`));

/** Header checkbox that selects every row in the list. */
export function SelectAll({ formId, label }: { formId: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="row-above h-4 w-4 accent-brand"
      onChange={(e) => {
        const on = e.currentTarget.checked;
        for (const b of boxes(formId)) b.checked = on;
      }}
    />
  );
}

/** Checkbox in a list row; it belongs to the bulk form through the form attribute. */
export function RowCheckbox({ formId, id, label }: { formId: string; id: string; label: string }) {
  return (
    <input type="checkbox" name="ids" value={id} form={formId} aria-label={label} className="row-above h-4 w-4 accent-brand" />
  );
}

/** Floating action bar shown while rows are selected. */
export function BulkBar({
  formId,
  kind,
  projects,
  members,
  texts,
}: {
  formId: string;
  kind: "companies" | "contacts";
  projects: Option[];
  members: Option[];
  texts: BulkTexts;
}) {
  const [count, setCount] = useState(0);
  const [op, setOp] = useState("");
  const [state, action, pending] = useActionState<BulkState, FormData>(bulkEdit, {});

  const recount = useCallback(() => setCount(boxes(formId).filter((b) => b.checked).length), [formId]);

  useEffect(() => {
    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") recount();
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [recount]);

  const clear = useCallback(() => {
    for (const b of document.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
      if (b.form?.id === formId || b.getAttribute("form") === formId || b.closest("thead")) b.checked = false;
    }
    recount();
  }, [formId, recount]);

  // after a successful action the list is refreshed; start with a clean selection
  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => {
      clear();
      setOp("");
    }, 0);
    return () => clearTimeout(timer);
  }, [state, clear]);

  // the result message fades out after a few seconds
  const [seenAt, setSeenAt] = useState<number | undefined>();
  useEffect(() => {
    if (!state.at) return;
    const timer = setTimeout(() => setSeenAt(state.at), 4000);
    return () => clearTimeout(timer);
  }, [state.at]);
  const showMessage = !pending && !!state.message && seenAt !== state.at;
  if (count === 0 && !showMessage) return null;

  return (
    <div className="sticky bottom-4 z-20 flex justify-center">
      <form
        id={formId}
        action={action}
        onSubmit={(e) => {
          if (op === "delete" && !window.confirm(texts.confirmDelete.replace("{n}", String(count)))) e.preventDefault();
        }}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
      >
        <input type="hidden" name="kind" value={kind} />
        {count > 0 ? (
          <>
            <span className="font-medium tabular-nums">{texts.selected.replace("{n}", String(count))}</span>
            <button type="button" onClick={clear} className="text-xs text-muted hover:text-foreground hover:underline">
              {texts.clear}
            </button>
            <select
              name="op"
              required
              value={op}
              onChange={(e) => setOp(e.target.value)}
              aria-label={texts.chooseAction}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <option value="">{texts.chooseAction}</option>
              {projects.length > 0 && <option value="add_project">{texts.addToProject}</option>}
              {projects.length > 0 && <option value="remove_project">{texts.removeFromProject}</option>}
              <option value="owner">{texts.setOwner}</option>
              <option value="delete">{texts.delete}</option>
            </select>
            {(op === "add_project" || op === "remove_project") && (
              <select
                name="project_id"
                required
                defaultValue=""
                aria-label={texts.chooseProject}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              >
                <option value="" disabled>
                  {texts.chooseProject}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {op === "owner" && (
              <select
                name="owner_id"
                defaultValue=""
                aria-label={texts.setOwner}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              >
                <option value="">{texts.noOwner}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={!op || pending}
              className={`rounded-lg px-4 py-1.5 font-medium text-white disabled:opacity-50 ${
                op === "delete" ? "bg-danger hover:opacity-90" : "bg-brand hover:bg-brand-hover"
              }`}
            >
              {texts.apply}
            </button>
          </>
        ) : null}
        {showMessage && (
          <span role="status" className={state.ok ? "text-brand" : "text-danger"}>
            {state.message}
          </span>
        )}
      </form>
    </div>
  );
}
