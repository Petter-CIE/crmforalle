import { start } from "./lib.mjs";
const v = await start("03-ny-kunde");
const P = () => v.page;

v.title("Slik legger du inn en ny kunde", "Bedriften hentes fra Brønnøysundregistrene – du legger bare til kontaktpersonen");
await v.go("/app/bedrifter");
await v.shot({ cursor: [2000, 1400], fade: 0.5 });
v.step("Steg 1 av 4", "Åpne Bedrifter og trykk «+ Ny bedrift»", 1.0);
await v.clickOn(P().getByRole("link", { name: /Ny bedrift/ }).first());
await P().waitForURL("**/app/bedrifter/ny");
await v.settle();
await v.shot({ fade: 0.3 });

const search = P().getByPlaceholder("Søk på firmanavn eller org.nr.");
v.zoom(await v.union([P().getByText("Hent fra Brønnøysundregistrene"), P().locator("input[name=org_number]"), search], 80), 0.9);
v.step("Steg 2 av 4", "Søk på firmanavn eller org.nr.", 1.0);
await v.clickOn(search);
await v.typeInto(search, "CIE AS", 1);
const opt = P().getByRole("option").filter({ hasText: /^\s*CIE AS/i }).first();
await opt.waitFor({ timeout: 20000 });
await P().waitForTimeout(400);
await v.shot({ hold: 1.4 });
await v.clickOn(opt);
await P().waitForTimeout(700);
v.zoom(await v.union([P().getByText("Hent fra Brønnøysundregistrene"), P().locator("textarea[name=notes]")], 60), 0.9);
await v.shot({ hold: 0.5 });
v.note("Adresse, bransje og kontaktinfo fylles ut automatisk", 3.0);
v.step("Steg 3 av 4", "Trykk «Lagre»", 0.6);
await v.clickOn(P().getByRole("button", { name: "Lagre" }));
await P().waitForURL(/\/app\/bedrifter\/[0-9a-f-]{36}/, { timeout: 20000 });
await v.settle();
v.zoom(null, 0.6);
const panel = async () => {
  const l = P().getByText("Fra Brønnøysund").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  return (await l.count()) ? [await v.box(l.first(), 12)] : [];
};
v.autoBlur = panel;
await v.shot({ fade: 0.3, hold: 1.0 });
v.note("Bedriften er lagt inn – og AllSeats varsler deg hvis status i registeret endres", 2.8);

v.step("Steg 4 av 4", "Legg til kontaktpersonen: trykk «+ Ny kontakt»", 1.0);
await v.clickOn(P().getByRole("link", { name: /Ny kontakt/ }).first());
await P().waitForURL("**/app/kontakter/ny**");
v.autoBlur = null;
await v.settle();
await v.shot({ fade: 0.3 });
v.zoom(await v.union([P().locator("#k_first"), P().locator("#k_title"), P().locator("#k_phone")], 90), 0.9);
v.note("Fyll inn navn, e-post, telefon og stilling", 0.4);
for (const [id, text, every] of [["#k_first", "Kari", 2], ["#k_last", "Nordmann", 2], ["#k_email", "kari@cie.example", 3], ["#k_phone", "+47 900 00 456", 3], ["#k_title", "Daglig leder", 3]]) {
  const f = P().locator(id);
  await v.clickOn(f, { dur: 0.6 });
  await v.typeInto(f, text, every);
}
v.hold(0.8);
v.zoom(null, 0.7);
const save = P().getByRole("button", { name: "Lagre" }).first();
await v.clickOn(save);
await P().waitForURL((u) => !u.pathname.endsWith("/ny"), { timeout: 20000 });
await v.settle();
v.autoBlur = panel;
await v.shot({ fade: 0.3, hold: 0.8 });
const kontakter = P().getByText("Kontakter", { exact: true }).last();
v.move(await v.center(P().getByText("Kari Nordmann").first()), 1.0);
v.note("Ferdig! Kari Nordmann er nå kontaktperson hos CIE AS", 3.4);
v.end();
await v.finish();
