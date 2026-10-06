// Fills the demo workspace (Leknesokker) with fictional data, signed in as the demo user, so RLS applies.
// All company names were checked against Brønnøysundregistrene (no matches); no org numbers; e-mails on example.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  fs.readFileSync(new URL("./.env", import.meta.url), "utf8").trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const db = createClient("https://lzhqaxjlhatexerxmtxn.supabase.co", "sb_publishable_hgERd6vRSgnHMZb8hr6r2A_M3GVzqk9", {
  auth: { persistSession: false },
});
const { data: auth, error: authErr } = await db.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
if (authErr) throw authErr;
const me = auth.user.id;
const WS = "5d5e18e5-843f-468e-a3bc-b1857841189b";

const { count } = await db.from("companies").select("id", { count: "exact", head: true }).eq("workspace_id", WS);
if (count) throw new Error(`workspace already has ${count} companies – not seeding twice`);

const day = 86400000;
const at = (d, h = 10) => new Date(Math.floor(Date.now() / day) * day + d * day + h * 3600000).toISOString();
const ins = async (table, rows) => {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};
const S = {
  ny: "bfc46703-0186-4a6a-936b-7d094c72636d",
  kontaktet: "d6219a25-d098-496c-bbe1-1b6b1db68526",
  tilbud: "a6073cde-ecfb-49d8-8862-1e926e5a2b66",
  forhandling: "ca4bd337-7300-43b7-96a4-169079adf08d",
  vunnet: "9780b485-2081-40c9-8a44-e94e04e351bb",
  tapt: "b90ccf08-6211-4758-90be-48aa3a3e1ae4",
};

const [klubb, gave] = await ins("projects", [
  { workspace_id: WS, name: "Klubbsokker 2027", description: "Sokker med klubblogo til idrettslag før vintersesongen.", color: "#2563eb", owner_id: me, created_by: me },
  { workspace_id: WS, name: "Julegaver bedrift", description: "Sokker med logo som julegave til ansatte og kunder.", color: "#dc2626", owner_id: me, created_by: me },
]);

await ins("products", [
  { workspace_id: WS, name: "Ullsokk Lofoten", description: "Varm ullsokk, 80 % merinoull", sku: "LS-ULL-01", unit: "par", unit_price: 149, vat_rate: 25 },
  { workspace_id: WS, name: "Sportssokk med logo", description: "Brodert logo, minimum 100 par", sku: "LS-SPORT-LOGO", unit: "par", unit_price: 89, vat_rate: 25 },
  { workspace_id: WS, name: "Gaveeske 3 par", description: "Tre par i gaveeske med kort", sku: "LS-GAVE-3", unit: "stk", unit_price: 399, vat_rate: 25 },
  { workspace_id: WS, name: "Designoppsett logo", description: "Engangskostnad for logo og prøve", sku: "LS-DESIGN", unit: "stk", unit_price: 1500, vat_rate: 25 },
]);

const C = [
  ["Skarvvik IL", "Skarvvik", "8370", "Leknes", "post@skarvvik-il.example"],
  ["Tindheia Sport AS", "Storgata 12", "8300", "Svolvær", "butikk@tindheia.example"],
  ["Rypefjell Skisenter AS", "Rypefjellvegen 40", "8370", "Leknes", "post@rypefjell.example"],
  ["Torvbakken Rådgivning AS", "Torvbakken 3", "8006", "Bodø", "post@torvbakken.example"],
  ["Krykkjeberg Hotell AS", "Havnegata 1", "8380", "Ramberg", "booking@krykkjeberg.example"],
  ["Sølvmåkevika Kafé", "Brygga 5", "8390", "Reine", "kafe@solvmakevika.example"],
  ["Lunnefjell Turlag", "Postboks 22", "8370", "Leknes", "styret@lunnefjell.example"],
  ["Brisvika Rørlegger AS", "Industrivegen 8", "8370", "Leknes", "post@brisvika-ror.example"],
  ["Kobbeskjær Bygg AS", "Kaiveien 14", "8340", "Stamsund", "post@kobbeskjaer.example"],
  ["Strandløper Treningssenter AS", "Sentrum 7", "8300", "Svolvær", "hei@strandloper.example"],
  ["Multeheia Barnehage", "Multeheia 2", "8370", "Leknes", "styrer@multeheia.example"],
  ["Ternevika Fiskemottak AS", "Ternevika", "8382", "Napp", "post@ternevika.example"],
];
const companies = await ins(
  "companies",
  C.map(([name, address, postal_code, city, email]) => ({
    workspace_id: WS, name, address, postal_code, city, email, owner_id: me, created_by: me,
    website: `https://${email.split("@")[1]}`,
  })),
);
const co = Object.fromEntries(companies.map((c) => [c.name, c.id]));

const P = [
  ["Skarvvik IL", "Marte", "Johansen", "Daglig leder", "marte"],
  ["Skarvvik IL", "Ola", "Berg", "Fotballtrener", "ola"],
  ["Tindheia Sport AS", "Kristian", "Nilsen", "Innkjøper", "kristian"],
  ["Rypefjell Skisenter AS", "Hanne", "Olsen", "Markedssjef", "hanne"],
  ["Torvbakken Rådgivning AS", "Eirik", "Pedersen", "Daglig leder", "eirik"],
  ["Torvbakken Rådgivning AS", "Silje", "Karlsen", "HR-ansvarlig", "silje"],
  ["Krykkjeberg Hotell AS", "Thomas", "Hansen", "Hotellsjef", "thomas"],
  ["Sølvmåkevika Kafé", "Ida", "Larsen", "Eier", "ida"],
  ["Lunnefjell Turlag", "Per", "Andersen", "Styreleder", "per"],
  ["Brisvika Rørlegger AS", "Jonas", "Eriksen", "Daglig leder", "jonas"],
  ["Kobbeskjær Bygg AS", "Camilla", "Svendsen", "Kontorleder", "camilla"],
  ["Strandløper Treningssenter AS", "Mats", "Haugen", "Senterleder", "mats"],
  ["Multeheia Barnehage", "Ragnhild", "Moen", "Styrer", "ragnhild"],
  ["Ternevika Fiskemottak AS", "Lars", "Jakobsen", "Driftsleder", "lars"],
];
const contacts = await ins(
  "contacts",
  P.map(([c, first_name, last_name, title, local], i) => {
    const domain = C.find((x) => x[0] === c)[4].split("@")[1];
    return {
      workspace_id: WS, kind: "b2b", company_id: co[c], first_name, last_name, title,
      email: `${local}@${domain}`, phone: `+47 900 00 ${String(100 + i).slice(-3)}`, owner_id: me, created_by: me,
    };
  }),
);
const b2c = await ins("contacts", [
  { workspace_id: WS, kind: "b2c", first_name: "Nora", last_name: "Strand", email: "nora.strand@privat.example", city: "Leknes", marketing_consent: true, marketing_consent_at: at(-40), owner_id: me, created_by: me },
  { workspace_id: WS, kind: "b2c", first_name: "Henrik", last_name: "Lie", email: "henrik.lie@privat.example", city: "Svolvær", marketing_consent: true, marketing_consent_at: at(-12), owner_id: me, created_by: me },
]);
const ct = Object.fromEntries(contacts.map((c) => [c.first_name, c]));

const D = [
  ["Klubbsokker til fotballaget, 300 par", "Skarvvik IL", "Marte", S.forhandling, 26700, klubb.id, 12],
  ["Ullsokker til butikken – vinter", "Tindheia Sport AS", "Kristian", S.tilbud, 44700, null, 20],
  ["Sokker med logo til skiskolen", "Rypefjell Skisenter AS", "Hanne", S.kontaktet, 17800, klubb.id, 30],
  ["Julegave til 40 ansatte", "Torvbakken Rådgivning AS", "Silje", S.tilbud, 15960, gave.id, 25],
  ["Gavesokker til hotellgjester", "Krykkjeberg Hotell AS", "Thomas", S.ny, 12000, null, 45],
  ["Sokker til turlagets medlemmer", "Lunnefjell Turlag", "Per", S.kontaktet, 8900, klubb.id, 35],
  ["Julegave til kunder", "Brisvika Rørlegger AS", "Jonas", S.vunnet, 9975, gave.id, -5],
  ["Arbeidssokker til byggeplassen", "Kobbeskjær Bygg AS", "Camilla", S.forhandling, 22350, null, 15],
  ["Merch til treningssenteret", "Strandløper Treningssenter AS", "Mats", S.ny, 8900, null, 50],
  ["Ullsokker til de ansatte", "Ternevika Fiskemottak AS", "Lars", S.tapt, 11920, null, -20],
];
const deals = await ins(
  "deals",
  D.map(([title, c, person, stage_id, value, project_id, close], i) => ({
    workspace_id: WS, title, company_id: co[c], contact_id: ct[person].id, stage_id, value, currency: "NOK", project_id,
    owner_id: me, created_by: me, expected_close: at(close).slice(0, 10), position: i,
    closed_at: stage_id === S.vunnet || stage_id === S.tapt ? at(close) : null,
    lost_reason: stage_id === S.tapt ? "Valgte en billigere leverandør" : null,
  })),
);
const dl = Object.fromEntries(deals.map((d) => [d.title, d]));

await ins("tasks", [
  { title: "Ring Marte om antall og størrelser", due_at: at(0, 9), company: "Skarvvik IL", contact: "Marte", deal: "Klubbsokker til fotballaget, 300 par", project_id: klubb.id },
  { title: "Send prøve av logo til Rypefjell", due_at: at(0, 13), company: "Rypefjell Skisenter AS", contact: "Hanne", deal: "Sokker med logo til skiskolen", project_id: klubb.id },
  { title: "Følg opp tilbudet til Tindheia", due_at: at(-1, 10), company: "Tindheia Sport AS", contact: "Kristian", deal: "Ullsokker til butikken – vinter" },
  { title: "Bestill gaveesker til Torvbakken", due_at: at(2, 10), company: "Torvbakken Rådgivning AS", contact: "Silje", deal: "Julegave til 40 ansatte", project_id: gave.id },
  { title: "Møte med Kobbeskjær om arbeidssokker", due_at: at(3, 14), company: "Kobbeskjær Bygg AS", contact: "Camilla", deal: "Arbeidssokker til byggeplassen" },
  { title: "Svar på henvendelse fra Krykkjeberg Hotell", due_at: at(1, 9), company: "Krykkjeberg Hotell AS", contact: "Thomas", deal: "Gavesokker til hotellgjester" },
  { title: "Lever sokkene til Brisvika", due_at: at(-3, 12), done: true, company: "Brisvika Rørlegger AS", contact: "Jonas", deal: "Julegave til kunder", project_id: gave.id },
  { title: "Oppdater prisliste for 2027", due_at: at(6, 10) },
].map(({ company, contact, deal, done, ...t }) => ({
  workspace_id: WS, ...t, assignee_id: me, created_by: me,
  company_id: company ? co[company] : null, contact_id: contact ? ct[contact].id : null, deal_id: deal ? dl[deal].id : null,
  done_at: done ? at(-3, 15) : null,
})));

await ins("activities", [
  { type: "call", body: "Marte vil ha 300 par til A-laget og juniorene. Ønsker levering før 1. desember.", company: "Skarvvik IL", contact: "Marte", deal: "Klubbsokker til fotballaget, 300 par", d: -6 },
  { type: "meeting", body: "Møte på klubbhuset. Gikk gjennom farger og logo. De vil ha blå sokker med hvit logo.", company: "Skarvvik IL", contact: "Marte", deal: "Klubbsokker til fotballaget, 300 par", d: -3 },
  { type: "note", body: "Budsjett er rundt 25 000 kr. Kan bli flere par hvis prisen er riktig.", company: "Skarvvik IL", contact: "Ola", d: -2 },
  { type: "email", body: "Sendt prisliste og bilder av ullsokkene.", company: "Tindheia Sport AS", contact: "Kristian", deal: "Ullsokker til butikken – vinter", d: -8 },
  { type: "call", body: "Kristian liker sokkene, men vil ha 5 % rabatt ved 300 par.", company: "Tindheia Sport AS", contact: "Kristian", deal: "Ullsokker til butikken – vinter", d: -4 },
  { type: "note", body: "Ønsker sokker med logo til instruktørene og til salg i skiutleien.", company: "Rypefjell Skisenter AS", contact: "Hanne", deal: "Sokker med logo til skiskolen", d: -5 },
  { type: "email", body: "Silje bekreftet 40 ansatte. Gaveeske med 3 par og julekort.", company: "Torvbakken Rådgivning AS", contact: "Silje", deal: "Julegave til 40 ansatte", d: -7 },
  { type: "email", body: "Thomas skrev: «Vi vil gjerne ha sokker til gjestene våre i vinter.»", company: "Krykkjeberg Hotell AS", contact: "Thomas", deal: "Gavesokker til hotellgjester", d: -1 },
  { type: "meeting", body: "Befaring på byggeplassen. Trenger slitesterke sokker i størrelse 41–46.", company: "Kobbeskjær Bygg AS", contact: "Camilla", deal: "Arbeidssokker til byggeplassen", d: -9 },
  { type: "note", body: "Bestilling bekreftet: 25 gaveesker, levering uke 48.", company: "Brisvika Rørlegger AS", contact: "Jonas", deal: "Julegave til kunder", d: -5 },
  { type: "call", body: "Lars ringte: de har valgt en billigere leverandør i år.", company: "Ternevika Fiskemottak AS", contact: "Lars", deal: "Ullsokker til de ansatte", d: -20 },
  { type: "call", body: "Per tar saken opp på neste styremøte.", company: "Lunnefjell Turlag", contact: "Per", deal: "Sokker til turlagets medlemmer", d: -10 },
].map(({ company, contact, deal, d, ...a }) => ({
  workspace_id: WS, ...a, author_id: me, occurred_at: at(d, 11),
  company_id: co[company], contact_id: contact ? ct[contact].id : null, deal_id: deal ? dl[deal].id : null,
})));

console.log(`seeded: ${companies.length} companies, ${contacts.length + b2c.length} contacts, ${deals.length} deals, 8 tasks, 12 activities, 2 projects, 4 products`);
