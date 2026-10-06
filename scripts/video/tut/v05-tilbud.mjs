import { start } from "./lib.mjs";
const v = await start("05-tilbud");
const P = () => v.page;
const DEAL = "Klubbsokker til fotballaget, 300 par";

v.title("Slik lager og sender du et tilbud", "Med produkter, rabatt og MVA – kunden svarer med ett klikk");
await v.go("/app/salg");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 1 av 4", "Åpne salget og trykk «+ Lag tilbud»", 1.0);
await v.clickOn(P().getByRole("link", { name: DEAL }).first());
await P().waitForURL(/\/app\/salg\/[0-9a-f-]{36}/);
await v.settle();
await v.shot({ fade: 0.3, hold: 0.6 });
await v.clickOn(P().getByRole("button", { name: /Lag tilbud/ }).first());
await P().waitForURL(/\/app\/tilbud\/[0-9a-f-]{36}/);
await v.settle(900);
await v.shot({ fade: 0.3, hold: 0.6 });
v.note("Kunde, kontaktperson og tittel er fylt inn fra salget", 2.6);

const intro = P().locator("#q_intro");
v.zoom(await v.union([P().locator("#q_title"), intro], 80), 0.9);
v.step("Steg 2 av 4", "Skriv en kort innledning", 0.8);
await v.clickOn(intro);
await v.typeInto(intro, "Takk for et hyggelig møte! Her er tilbudet på klubbsokker med logo.", 6);
v.hold(0.6);

const prod = P().locator('input[placeholder^="Søk etter produkt"]');
v.step("Steg 3 av 4", "Legg til produkter fra produktlisten", 0.6);
v.zoom(await v.union([P().getByText("Linjer", { exact: true }), prod, P().getByText("Totalt inkl. mva")], 100), 0.9);
await v.clickOn(prod);
await v.typeInto(prod, "Sport", 1);
let opt = P().getByRole("option", { name: /Sportssokk med logo/ }).first();
await opt.waitFor();
await P().waitForTimeout(300);
await v.shot({ hold: 0.8 });
await v.clickOn(opt);
await P().waitForTimeout(500);
await v.shot({ hold: 0.5 });
const qty = P().getByLabel("Antall").first();
await v.clickOn(qty, { dur: 0.7 });
await qty.fill("");
await v.typeInto(qty, "300", 1);
const disc = P().getByLabel("Rabatt %").first();
await v.clickOn(disc, { dur: 0.7 });
await v.typeInto(disc, "5", 1);
await P().waitForTimeout(300);
await v.shot({ hold: 0.6 });
v.note("Rabatt og MVA regnes ut automatisk", 2.2);
await v.clickOn(prod, { dur: 0.7 });
await v.typeInto(prod, "Design", 2);
opt = P().getByRole("option", { name: /Designoppsett logo/ }).first();
await opt.waitFor();
await P().waitForTimeout(300);
await v.shot({ hold: 0.6 });
await v.clickOn(opt);
await P().waitForTimeout(600);
v.zoom(await v.union([P().getByText("Linjer", { exact: true }), P().getByText("Totalt inkl. mva")], 100), 0.7);
await v.shot({ hold: 2.0 });
const saveQ = P().getByRole("button", { name: "Lagre tilbudet" });
v.zoom(null, 0.7);
await v.clickOn(saveQ);
await v.settle(1000);
await v.shot({ fade: 0.2, hold: 0.6 });
v.move(await v.center(P().getByRole("link", { name: "Forhåndsvis PDF" }).or(P().getByRole("button", { name: "Forhåndsvis PDF" })).first()), 0.9);
v.note("«Forhåndsvis PDF» viser tilbudet slik kunden får det – med logoen deres", 3.0);

v.step("Steg 4 av 4", "Sjekk e-postadressen og trykk «Send tilbudet»", 0.6);
const send = P().getByRole("button", { name: "Send tilbudet" });
v.move(await v.center(P().locator("#s_to")), 1.0);
v.zoom(await v.union([P().getByText("Send tilbudet", { exact: true }).first(), send, P().locator("#s_msg")], 90), 0.9);
v.hold(1.6);
v.move(await v.center(send), 0.8);
v.hold(2.0);
v.zoom(null, 0.7);
v.card({ kicker: "Etter at tilbudet er sendt", text: "Du ser hva kunden gjør" }, [
  "Kunden får e-post med tilbudet som PDF og en lenke.",
  "Du ser når kunden åpner tilbudet.",
  "Kunden aksepterer eller avslår med ett klikk – du får varsel med en gang.",
], 7);
v.end();
await v.finish();
