/** A block is a paragraph or a bulleted list. */
export type Block = string | { list: string[] };

export type LegalDoc = {
  title: string;
  /** Short line under the title, e.g. who the agreement is between. */
  lead: string;
  sections: { h: string; body: Block[] }[];
};

/** Bump when the terms or the DPA change in substance; acceptance is stored per company. */
export const TERMS_VERSION = "2026-10-02";

export const OPERATOR = {
  name: "CIE AS",
  orgNo: "818 823 452",
  place: "Bjørøyhamn, Øygarden",
  email: "post@allseats.no",
};
