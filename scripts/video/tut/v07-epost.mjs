import { start } from "./lib.mjs";
const v = await start("07-epost");
const P = () => v.page;
// the CRM address is secret: mask it in the page before every screenshot
const mask = () => P().evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (/crm-[a-z0-9]{10}@/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/crm-[a-z0-9]{10}@/gi, "crm-••••••••••@");
  document.querySelectorAll("input").forEach((i) => { if (/crm-[a-z0-9]{10}@/i.test(i.value)) i.value = i.value.replace(/crm-[a-z0-9]{10}@/gi, "crm-••••••••••@"); });
});
const shot = async (o) => { await mask(); return v.shot(o); };

v.title("Slik lagrer du e-post i CRM-et", "Fra Outlook, Gmail eller mobilen – uten å kopiere noe");
await v.go("/app");
await shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 1 av 3", "Åpne E-post i menyen", 0.8);
await v.clickOn(P().getByRole("link", { name: "E-post", exact: true }).first());
await P().waitForURL("**/app/e-post");
await v.settle();
await shot({ fade: 0.3 });
const addr = P().getByText(/@inn\.allseats\.no/).first();
v.zoom(await v.union([P().getByText("Bedriftens CRM-adresse"), addr, P().getByText(/Lagre adressen som en kontakt/)], 100), 0.9);
v.note("Bedriften har sin egen CRM-adresse", 1.4);
await v.clickOn(P().getByRole("button", { name: "Kopier" }).first());
await P().waitForTimeout(400);
await shot({ hold: 0.6 });
v.note("Tips: lagre adressen som kontakten «CRM» i e-postprogrammet", 2.8);
v.zoom(null, 0.7);

v.card({ kicker: "Steg 2 av 3", text: "Når du skriver til en kunde" }, [
  "Skriv e-posten som vanlig i Outlook, Gmail eller på mobilen.",
  "Legg CRM-adressen i <b>Bcc</b> (blindkopi) – kunden ser den ikke.",
  "Send. E-posten dukker opp hos kunden i AllSeats.",
], 6.5);
v.card({ kicker: "Steg 2 av 3", text: "Når du har fått en e-post" }, [
  "Videresend e-posten til CRM-adressen.",
  "AllSeats finner avsenderen og lagrer e-posten på riktig kunde.",
], 5.5);

await v.go("/app/e-post");
await shot({ fade: 0.4, cursor: [2000, 1400] });
v.note("Under E-post finner du en veiledning for Outlook, Gmail og iPhone", 0.6);
const guide = P().getByText("Slik gjør du det i e-postprogrammet ditt");
await v.clickOn(guide);
await P().waitForTimeout(600);
await shot({ hold: 0.4 });
v.zoom(await v.union([guide, guide.locator("xpath=ancestor::details[1]")], 60), 0.9);
v.hold(3.2);
v.zoom(null, 0.7);

v.step("Steg 3 av 3", "E-posten havner i historikken til kunden", 0.6);
await v.go("/app/bedrifter");
await shot({ fade: 0.4 });
await v.clickOn(P().getByRole("link", { name: "Tindheia Sport AS" }).first());
await P().waitForURL(/\/app\/bedrifter\/[0-9a-f-]{36}/);
await v.settle();
await shot({ fade: 0.3, hold: 0.4 });
const mail = P().getByText("Sendt prisliste og bilder av ullsokkene.").first();
v.move(await v.center(mail), 1.0);
await shot({ hold: 0.2 });
v.zoom(await v.union([P().getByText("Aktivitet", { exact: true }).first(), mail], 120), 0.9);
v.note("Kontakter og bedrifter finnes på e-postadressen og domenet", 3.2);
v.note("Fant vi ingen? Da venter e-posten under E-post til du har lagt inn kontakten", 3.4);
v.zoom(null, 0.7);
v.end();
await v.finish();
