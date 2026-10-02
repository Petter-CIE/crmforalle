import type { Dictionary } from "@/lib/i18n/dictionaries";

export function companyFormTexts(t: Dictionary) {
  return { ...t.companies, notes: t.crm.notes, save: t.crm.save, saving: t.crm.saving };
}
