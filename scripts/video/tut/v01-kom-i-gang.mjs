import { start } from "./lib.mjs";
const v = await start("01-kom-i-gang", { loggedIn: true });
const { ev } = v;

v.title("Slik kommer du i gang", "Opprett konto og bedrift – det tar et par minutter");

// --- registration (logged out) ---
await v.switchTo(false);
await v.go("/");
await v.shot({ cursor: [1900, 1500], fade: 0.5 });
v.step("Steg 1 av 4", "Gå til allseats.no og trykk «Prøv gratis i 14 dager»", 1.6);
const cta = v.page.getByRole("link", { name: "Prøv gratis i 14 dager" }).first();
await v.clickOn(cta);
await v.page.waitForURL("**/registrer");
await v.settle();
await v.shot({ fade: 0.3 });
v.zoom(await v.union([v.page.getByText("Opprett konto", { exact: true }).first(), v.page.getByRole("button", { name: "Opprett konto" })], 80), 1.0);
v.step("Steg 2 av 4", "Skriv inn e-post og velg et passord", 1.2);
const email = v.page.locator("input[name=email]");
await v.clickOn(email);
await v.shot();
await v.typeInto(email, "ingrid@leknesokker.example", 3);
const pw = v.page.locator("input[name=password]");
await v.clickOn(pw);
await v.typeInto(pw, "hemmelig123", 3);
v.hold(0.6);
v.move(await v.center(v.page.getByRole("button", { name: "Opprett konto" })), 0.8);
v.hold(1.8);
v.note("Du kan også bruke Microsoft- eller Google-kontoen din", 0);
v.move(await v.center(v.page.getByText("Fortsett med Microsoft")), 0.9);
v.hold(2.4);
v.zoom(null, 0.8);

v.card({ kicker: "Steg 3 av 4", text: "Bekreft e-posten" }, [
  "Du får en e-post fra AllSeats i løpet av et minutt.",
  "Trykk på lenken i e-posten.",
  "Da åpnes AllSeats, og du kan sette opp bedriften.",
], 6);

// --- onboarding (logged in) ---
await v.switchTo(true);
await v.go("/kom-i-gang");
await v.shot({ cursor: [1900, 1700] });
v.zoom(await v.union([v.page.getByText("Sett opp bedriften din"), v.page.getByRole("button", { name: /Opprett og start/ })], 70), 1.0);
v.step("Steg 4 av 4", "Skriv navnet ditt og finn bedriften i Brønnøysundregistrene", 1.6);
const name = v.page.locator("#full_name");
await v.clickOn(name);
await name.fill("");
await v.shot({ hold: 0.3 });
await v.typeInto(name, "Ingrid Haugland", 3);
const search = v.page.getByPlaceholder("Søk på firmanavn eller org.nr.");
await v.clickOn(search);
await v.typeInto(search, "CIE AS", 1);
const opt = v.page.getByRole("option").filter({ hasText: /^\s*CIE AS/i }).first();
await opt.waitFor({ timeout: 15000 });
await v.page.waitForTimeout(500);
await v.shot({ hold: 1.2 });
await v.clickOn(opt);
await v.page.waitForTimeout(600);
await v.shot({ hold: 0.6 });
v.note("Navn og org.nr. fylles ut automatisk", 2.2);
const terms = v.page.locator("input[name=accept_terms]");
await v.clickOn(terms);
await v.shot({ hold: 0.6 });
const submit = v.page.getByRole("button", { name: /Opprett og start/ });
v.move(await v.center(submit), 0.9);
v.note("Trykk «Opprett og start prøveperioden»", 2.4);
v.zoom(null, 0.8);

// --- result ---
await v.go("/app");
await v.shot({ fade: 0.5, cursor: [2600, 1500] });
v.note("Ferdig! Sjekklisten viser deg hva du bør gjøre først", 0.6);
v.zoom(await v.union([v.page.getByText("Kom i gang", { exact: true }).first(), v.page.getByText("Registrer det første salget"), v.page.getByText("Inviter kollegene dine")], 70), 1.1);
v.hold(3.2);
v.zoom(null, 0.8);
v.end();
await v.finish();
