import Link from "next/link";
import { Input, Select } from "@/components/ui";
import { INACTIVE_DAYS, type ListFilters } from "@/lib/list-filters";
import { LiveFilter } from "./live-filter";

type Texts = {
  search: string;
  searchPlaceholder: string;
  allProjects: string;
  filter: string;
  owner: string;
  anyOwner: string;
  noOwner: string;
  city: string;
  anyActivity: string;
  inactiveDays: (d: number) => string;
  consentYes: string;
  reset: string;
  /** Contacts only: the B2B/B2C filter. */
  kinds?: { any: string; b2b: string; b2c: string };
};

/** Search and filters above the company/contact lists (a plain GET form, so the URL holds the view). */
export function ListFilterForm({
  f,
  base,
  projects,
  members,
  consent,
  t,
}: {
  f: ListFilters;
  base: string;
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
  consent?: boolean;
  t: Texts;
}) {
  const any = f.q || f.project || f.owner || f.city || f.inactive || f.consent || f.kind;
  return (
    <form className="space-y-2">
      <LiveFilter />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={f.q} placeholder={t.searchPlaceholder} aria-label={t.search} />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {t.filter}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {projects.length > 0 && (
          <Select name="prosjekt" defaultValue={f.project} aria-label={t.allProjects} className="!py-1.5">
            <option value="">{t.allProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {members.length > 1 && (
          <Select name="ansvarlig" defaultValue={f.owner} aria-label={t.owner} className="!py-1.5">
            <option value="">{t.anyOwner}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="ingen">{t.noOwner}</option>
          </Select>
        )}
        <Input name="sted" defaultValue={f.city} placeholder={t.city} aria-label={t.city} className="!w-36 !py-1.5" />
        <Select name="inaktiv" defaultValue={f.inactive ? String(f.inactive) : ""} aria-label={t.anyActivity} className="!py-1.5">
          <option value="">{t.anyActivity}</option>
          {INACTIVE_DAYS.map((d) => (
            <option key={d} value={d}>
              {t.inactiveDays(d)}
            </option>
          ))}
        </Select>
        {t.kinds && (
          <Select name="type" defaultValue={f.kind} aria-label={t.kinds.any} className="!py-1.5">
            <option value="">{t.kinds.any}</option>
            <option value="b2b">{t.kinds.b2b}</option>
            <option value="b2c">{t.kinds.b2c}</option>
          </Select>
        )}
        {consent && (
          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <input type="checkbox" name="samtykke" value="1" defaultChecked={f.consent} className="h-4 w-4 accent-[var(--brand)]" />
            {t.consentYes}
          </label>
        )}
        {any && (
          <Link href={base} className="px-2 text-sm text-muted hover:text-foreground hover:underline">
            {t.reset}
          </Link>
        )}
      </div>
    </form>
  );
}
