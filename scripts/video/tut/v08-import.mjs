import { start } from "./lib.mjs";
const v = await start("08-import");
const P = () => v.page;

v.title("Slik importerer du kundene dine", "Fra Excel eller CSV – på et par minutter");
await v.go("/app/kontakter");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 1 av 3", "Gå til Kontakter eller Bedrifter og trykk «Importer»", 1.0);
await v.clickOn(P().getByRole("link", { name: /Importer/ }).first());
await P().waitForURL("**/app/import**");
await v.settle();
await v.shot({ fade: 0.3, hold: 0.6 });
v.move(await v.center(P().getByText("Last ned Excel-mal med veiledning")), 0.9);
v.note("Har du ingen fil? Last ned malen – den forklarer kolonnene", 2.8);

v.step("Steg 2 av 3", "Velg Excel- eller CSV-filen din", 0.6);
const pick = P().getByText("Velg fil");
await v.clickOn(pick, { real: false });
await P().locator("input[type=file]").setInputFiles(v.dir + "../../Kundeliste.xlsx");
await P().getByText("Koble kolonnene").waitFor();
await v.settle(600);
await v.shot({ hold: 0.6 });
v.move(await v.center(P().getByLabel("Felt i CRM-et: Firmanavn")), 1.0);
v.zoom(await v.union([P().getByText("Koble kolonnene"), P().getByLabel("Felt i CRM-et: Telefon"), P().getByText("5 rader funnet")], 80), 0.9);
v.note("AllSeats gjetter hva kolonnene betyr – rett det som er feil", 3.2);
v.zoom(null, 0.6);
v.move(await v.center(P().getByLabel("Felt i CRM-et: Kontaktperson")), 0.9);
v.zoom(await v.union([P().getByLabel("Felt i CRM-et: Adresse"), P().getByLabel("Felt i CRM-et: Kontaktperson"), P().getByText("Kontaktperson", { exact: true }).first()], 90), 0.9);
v.note("«Kontaktperson» deles automatisk i fornavn og etternavn", 3.0);
v.zoom(null, 0.7);

v.step("Steg 3 av 3", "Trykk «Importer»", 0.6);
const go = P().getByRole("button", { name: /Importer \d+ rader/ });
await v.clickOn(go);
await P().waitForTimeout(3000);
await v.settle(800);
await v.shot({ hold: 0.4 });
v.zoom(await v.union([P().getByText("Importen er ferdig"), P().getByRole("link", { name: /Gå til kontakter/ }).or(P().getByRole("button", { name: /Gå til kontakter/ })).first()], 120), 0.9);
v.note("Bedrifter som ikke finnes, opprettes – og like e-poster hoppes over", 3.2);
v.zoom(null, 0.6);
await v.go("/app/bedrifter");
await v.shot({ fade: 0.4, hold: 0.4 });
v.move(await v.center(P().getByText("Spoleberg Sykkel AS").first()), 1.0);
v.note("Ferdig! Kundene ligger nå i AllSeats", 3.0);
v.card({ kicker: "Tips", text: "Vil du heller at vi gjør det?" }, [
  "Send filen til post@allseats.no.",
  "Vi importerer kundene for deg for 150 kr eks. mva.",
  "Formatet spiller ingen rolle – også eksport fra et annet system.",
], 6);
v.end();
await v.finish();
