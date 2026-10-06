"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Notice, Select } from "@/components/ui";
import { importChunk, type ImportResult, type ImportRow } from "./actions";

const FIELDS = [
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone",
  "title",
  "company",
  "org_number",
  "address",
  "postal_code",
  "city",
  "notes",
] as const;
type Field = (typeof FIELDS)[number];

const MAX_ROWS = 5000;
const CHUNK = 200;

// Common headings in Norwegian and English (compared without case, spaces and punctuation)
const SYNONYMS: Record<Field, string[]> = {
  first_name: ["fornavn", "firstname", "givenname", "first"],
  last_name: ["etternavn", "lastname", "surname", "familyname", "last"],
  full_name: ["navn", "name", "fulltnavn", "fullname", "kontaktperson", "contact", "contactname", "contactperson", "kontakt"],
  email: ["epost", "email", "mail", "epostadresse", "emailaddress"],
  phone: ["telefon", "tlf", "mobil", "mobiltelefon", "phone", "mobile", "telephone", "telefonnummer", "phonenumber"],
  title: ["stilling", "tittel", "title", "jobtitle", "position", "rolle", "role"],
  company: ["bedrift", "firma", "selskap", "company", "organisation", "organization", "kunde", "firmanavn", "companyname", "bedriftsnavn"],
  org_number: ["orgnr", "organisasjonsnummer", "orgnumber", "organizationnumber", "orgno", "organisationnumber", "orgnummer"],
  address: ["adresse", "address", "gateadresse", "street", "streetaddress", "postadresse"],
  postal_code: ["postnr", "postnummer", "postalcode", "zip", "zipcode", "postcode"],
  city: ["sted", "poststed", "by", "city", "town", "kommune"],
  notes: ["notater", "notat", "kommentar", "merknad", "notes", "note", "comment", "comments"],
};
const EXAMPLE_EMAIL = /@(eksempel\.no|example\.com)$/i;
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9æøå]/g, "");
function guess(header: string): Field | "" {
  const h = norm(header);
  for (const f of FIELDS) if (SYNONYMS[f].includes(h)) return f;
  return "";
}

type Texts = {
  intro: string;
  choose: string;
  dropHint: string;
  template: string;
  templateFile: string;
  reading: string;
  badFile: string;
  empty: string;
  tooMany: string; // {max}
  rows: string; // {n}
  rowsOne: string;
  mapTitle: string;
  mapIntro: string;
  column: string;
  example: string;
  field: string;
  skip: string;
  fields: Record<Field, string>;
  needName: string;
  optionsTitle: string;
  createCompanies: string;
  addToProject: string;
  noProject: string;
  rules: string;
  start: string; // {n}
  importing: string; // {done} {total}
  doneTitle: string;
  resultContacts: string; // {n}
  resultCompanies: string;
  resultDuplicates: string;
  resultInvalid: string;
  resultLimit: string;
  failed: string;
  again: string;
  toContacts: string;
  toCompanies: string;
};

/** Decodes a CSV file as UTF-8, falling back to Windows-1252 (Excel's default in Norway). */
async function decode(file: File) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

async function readFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = await readSheet(file);
    return data.map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? "" : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell))),
    );
  }
  const Papa = (await import("papaparse")).default;
  const parsed = Papa.parse<string[]>(await decode(file), { skipEmptyLines: "greedy" });
  return parsed.data;
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}

export function Importer({ t, projects }: { t: Texts; projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(Field | "")[]>([]);
  const [createCompanies, setCreateCompanies] = useState(true);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy("reading");
    try {
      // skip empty rows and the template's grey example rows (…@eksempel.no / …@example.com)
      const rows = (await readFile(file)).filter(
        (r) => r.some((c) => String(c).trim() !== "") && !r.some((c) => EXAMPLE_EMAIL.test(String(c ?? "").trim())),
      );
      if (rows.length < 2) {
        setError(t.empty);
        setHeaders([]);
        return;
      }
      if (rows.length - 1 > MAX_ROWS) {
        setError(t.tooMany.replace("{max}", String(MAX_ROWS)));
        setHeaders([]);
        return;
      }
      const head = rows[0].map((h) => String(h).trim());
      const width = Math.max(...rows.map((r) => r.length));
      const hdrs = Array.from({ length: width }, (_, i) => head[i] || `#${i + 1}`);
      const guessed = hdrs.map(guess);
      // keep only one column per field (first wins)
      const used = new Set<string>();
      setMapping(guessed.map((g) => (g && !used.has(g) ? (used.add(g), g) : "")));
      setHeaders(hdrs);
      setData(rows.slice(1));
      setFileName(file.name);
    } catch {
      setError(t.badFile);
      setHeaders([]);
    } finally {
      setBusy(null);
    }
  }

  const mapped = useMemo(() => new Set(mapping.filter(Boolean)), [mapping]);
  const canImport = mapped.has("first_name") || mapped.has("full_name") || mapped.has("last_name") || mapped.has("company");

  function toRows(): ImportRow[] {
    return data.map((cells) => {
      const r: Record<string, string> = {};
      mapping.forEach((f, i) => {
        const v = String(cells[i] ?? "").trim();
        if (!f || !v) return;
        if (f === "full_name") {
          const n = splitName(v);
          if (!r.first_name) r.first_name = n.first_name;
          if (!r.last_name && n.last_name) r.last_name = n.last_name;
        } else r[f] = v;
      });
      return r as ImportRow;
    });
  }

  async function run() {
    setBusy("importing");
    setError(null);
    const rows = toRows();
    const total: ImportResult = { contacts: 0, companies: 0, duplicates: 0, invalid: 0, overLimit: 0 };
    setProgress(0);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      let res: ImportResult;
      try {
        res = await importChunk({ rows: chunk, createCompanies, projectId: projectId || null });
      } catch {
        res = { contacts: 0, companies: 0, duplicates: 0, invalid: 0, overLimit: 0, error: true };
      }
      total.contacts += res.contacts;
      total.companies += res.companies;
      total.duplicates += res.duplicates;
      total.invalid += res.invalid;
      total.overLimit += res.overLimit;
      setProgress(Math.min(rows.length, i + chunk.length));
      if (res.error) {
        total.error = true;
        break;
      }
    }
    setResult(total);
    setBusy(null);
    router.refresh();
  }

  function reset() {
    setHeaders([]);
    setData([]);
    setMapping([]);
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result) {
    const lines = [
      t.resultContacts.replace("{n}", String(result.contacts)),
      t.resultCompanies.replace("{n}", String(result.companies)),
      result.duplicates ? t.resultDuplicates.replace("{n}", String(result.duplicates)) : null,
      result.invalid ? t.resultInvalid.replace("{n}", String(result.invalid)) : null,
      result.overLimit ? t.resultLimit.replace("{n}", String(result.overLimit)) : null,
    ].filter(Boolean);
    return (
      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t.doneTitle}</h2>
        {result.error && (
          <div className="mb-3">
            <Notice tone="error">{t.failed}</Notice>
          </div>
        )}
        <ul className="mb-5 list-disc space-y-1 pl-5 text-sm">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/kontakter" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            {t.toContacts}
          </Link>
          <Link href="/app/bedrifter" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
            {t.toCompanies}
          </Link>
          <button type="button" onClick={reset} className="px-2 text-sm text-brand hover:underline">
            {t.again}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="mb-4 text-sm text-muted">{t.intro}</p>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFile(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-brand bg-brand-soft" : "border-border hover:border-brand"
          }`}
        >
          <span className="text-2xl" aria-hidden>
            📄
          </span>
          <span className="font-medium text-brand">{busy === "reading" ? t.reading : fileName || t.choose}</span>
          <span className="text-xs text-muted">{t.dropHint} · .xlsx, .csv</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => void onFile(e.currentTarget.files?.[0])}
          />
        </label>
        <a href={t.templateFile} download className="mt-3 inline-block text-xs text-brand hover:underline">
          {t.template}
        </a>
        {error && (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </Card>

      {headers.length > 0 && (
        <>
          <Card className="overflow-x-auto">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{t.mapTitle}</h2>
              <span className="text-sm text-muted">{(data.length === 1 ? t.rowsOne : t.rows).replace("{n}", String(data.length))}</span>
            </div>
            <p className="mb-4 text-sm text-muted">{t.mapIntro}</p>
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">{t.column}</th>
                  <th className="pb-2 font-medium">{t.example}</th>
                  <th className="pb-2 font-medium">{t.field}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {headers.map((h, i) => {
                  const sample = data
                    .map((r) => String(r[i] ?? "").trim())
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(", ");
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-3 font-medium">{h}</td>
                      <td className="max-w-[16rem] truncate py-2 pr-3 text-muted" title={sample}>
                        {sample || "–"}
                      </td>
                      <td className="py-2">
                        <Select
                          aria-label={`${t.field}: ${h}`}
                          value={mapping[i]}
                          onChange={(e) => {
                            const v = e.target.value as Field | "";
                            setMapping((m) => m.map((x, j) => (j === i ? v : v && x === v ? "" : x)));
                          }}
                          className="w-full"
                        >
                          <option value="">{t.skip}</option>
                          {FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {t.fields[f]}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!canImport && (
              <div className="mt-3">
                <Notice tone="error">{t.needName}</Notice>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.optionsTitle}</h2>
            <div className="space-y-4 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={createCompanies} onChange={(e) => setCreateCompanies(e.target.checked)} className="mt-0.5" />
                {t.createCompanies}
              </label>
              {projects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="imp_project">{t.addToProject}</label>
                  <Select id="imp_project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">{t.noProject}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <p className="text-xs text-muted">{t.rules}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" onClick={run} disabled={!canImport || busy !== null}>
                  {busy === "importing"
                    ? t.importing.replace("{done}", String(progress)).replace("{total}", String(data.length))
                    : t.start.replace("{n}", String(data.length))}
                </Button>
                {busy === "importing" && (
                  <div className="h-2 w-48 overflow-hidden rounded-full bg-background" aria-hidden>
                    <div className="h-full bg-brand transition-all" style={{ width: `${(progress / data.length) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
