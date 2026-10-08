// Overview video: a read-only tour of the whole product (no data is created or changed,
// so tut/cleanup.mjs is not needed after this capture).
import { start } from "./lib.mjs";
const v = await start("12-oversikt");
const P = () => v.page;

// the CRM inbound address is secret: mask it in the page before every screenshot
const mask = () => P().evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (/crm-[a-z0-9]{10}@/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/crm-[a-z0-9]{10}@/gi, "crm-••••••••••@");
  document.querySelectorAll("input").forEach((i) => { if (/crm-[a-z0-9]{10}@/i.test(i.value)) i.value = i.value.replace(/crm-[a-z0-9]{10}@/gi, "crm-••••••••••@"); });
}).catch(() => {});
// Brønnøysund panels of real companies are blurred
const panel = async () => {
  const l = P().getByText("Fra Brønnøysund").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  return (await l.count()) ? [await v.box(l.first(), 12)] : [];
};
const shot = async (o) => { await mask(); return v.shot(o); };
const visit = async (path, fade = 0.45) => { await v.go(path); await v.settle(); await shot({ fade, hold: 0.4 }); };
const look = async (loc, dur = 1.0) => { if (await loc.count()) v.move(await v.center(loc.first()), dur); };

v.title("AllSeats CRM på to minutter", "Kunder, salg og oppfølging – samlet på ett sted");

// 1 · Today
await visit("/app");
v.move([2000, 1300], 0.8);
v.step("I dag", "Oppgaver, avtaler og salg som trenger deg – rett når du logger inn", 3.4);

// 2 · Companies and the customer card
await visit("/app/bedrifter");
v.step("Bedrifter og kontakter", "Hentes rett fra Brønnøysundregistrene med ett søk", 3.0);
v.autoBlur = panel;
const co = P().getByRole("link", { name: "Tindheia Sport AS" }).first();
await v.clickOn(co);
await P().waitForURL(/\/app\/bedrifter\/[0-9a-f-]{36}/);
await v.settle();
await shot({ fade: 0.3, hold: 0.6 });
v.note("Kundekortet: kontakter, salg, tilbud, e-post og hele historikken", 3.2);
const act = P().getByText("Aktivitet", { exact: true }).first();
if (await act.count()) {
  const mail = P().getByText("Sendt prisliste og bilder av ullsokkene.").first();
  const locs = (await mail.count()) ? [act, mail] : [act];
  v.zoom(await v.union(locs, 140), 0.9);
  v.note("Samtaler, e-post og notater havner automatisk i tidslinjen", 3.0);
  v.zoom(null, 0.7);
}
v.note("Du får varsel hvis kunden endrer status i registeret – for eksempel konkurs", 3.0);
v.autoBlur = null;

// 3 · Sales pipeline
await visit("/app/salg");
v.step("Salg", "Alle salgsmuligheter på en tavle – dra dem videre når noe skjer", 3.2);
await look(P().locator('section[aria-label="Kontaktet"]'), 1.0);
v.note("Sum og vektet verdi per fase oppdateres av seg selv", 2.8);

// 4 · Quotes
await visit("/app/tilbud");
v.step("Tilbud", "Lag tilbud med produkter og rabatt – sendes som PDF", 3.0);
v.note("Kunden aksepterer med ett klikk, og salget oppdateres automatisk", 3.0);

// 5 · Tasks
await visit("/app/oppgaver");
v.step("Oppgaver", "Påminnelser til deg og kollegene – på PC, mobil og i kalenderen", 3.2);

// 6 · E-mail and campaigns
await visit("/app/e-post");
v.step("E-post", "Fra Outlook eller Gmail rett inn på riktig kunde", 3.0);
await visit("/app/e-post/kampanjer");
v.step("Kampanjer", "Nyhetsbrev til utvalgte kunder – med samtykke og avmelding på plass", 3.2);

// 7 · Reports
await visit("/app/rapporter");
v.step("Rapporter", "Se salg, vunne avtaler og aktivitet – per selger og per periode", 3.0);

// 8 · Integrations
await visit("/app/innstillinger");
const acc = P().locator("#regnskap");
if (await acc.count()) {
  await look(acc, 1.0);
  await shot({ hold: 0.2 });
  v.zoom(await v.box(acc.first(), 60), 0.9);
}
v.step("Integrasjoner", "Kobles til Tripletex – fakturaer og utestående vises på kunden", 3.2);
v.zoom(null, 0.7);

v.card({ kicker: "Én fast pris", text: "For hele bedriften – uansett antall brukere" }, [
  "<b>Start</b> – 249 kr i måneden",
  "<b>Bedrift</b> – 990 kr i måneden",
  "Ubegrenset antall brukere, data lagret i EU",
  "Prøv gratis i 14 dager – uten kort",
], 7);
v.end();
await v.finish();
