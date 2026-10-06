import { start } from "./lib.mjs";
const v = await start("02-inviter-kolleger");
const P = () => v.page;

v.title("Slik inviterer du kollegene", "Ubegrenset antall brukere – prisen er den samme");
await v.go("/app");
await v.shot({ cursor: [1900, 1400], fade: 0.5 });
v.step("Steg 1 av 4", "Åpne Team i menyen", 1.0);
await v.clickOn(P().getByRole("link", { name: "Team", exact: true }).first());
await P().waitForURL("**/app/team");
await v.settle();
await v.shot({ fade: 0.3 });
v.hold(0.8);

const formZone = await v.union([P().getByText("Inviter en kollega"), P().locator("#invite_name"), P().getByRole("button", { name: "Inviter" })], 90);
v.zoom(formZone, 1.0);
v.step("Steg 2 av 4", "Skriv inn navn og e-post – telefon er valgfritt", 1.0);
const nm = P().locator("#invite_name");
await v.clickOn(nm);
await v.typeInto(nm, "Ingrid Haugland", 3);
const em = P().locator("#invite_email");
await v.clickOn(em);
await v.typeInto(em, "ingrid@leknesokker.example", 4);
const ph = P().locator("#invite_phone");
await v.clickOn(ph);
await v.typeInto(ph, "+47 900 00 123", 3);
v.hold(0.8);

v.step("Steg 3 av 4", "Velg rolle: Bruker eller Administrator", 1.0);
const role = P().locator("#invite_role");
await v.clickOn(role, { real: false });
v.hold(1.6);
v.note("Administrator kan også invitere kolleger og endre innstillinger", 2.6);

v.zoom(await v.union([P().getByText("Inviter en kollega"), P().getByText(/Velg ingen prosjekter/), P().getByRole("button", { name: "Inviter" }), P().getByText("Klubbsokker 2027")], 90), 0.9);
v.step("Steg 4 av 4", "Skal kollegaen bare se noen prosjekter? Huk av dem her", 1.0);
const proj = P().getByText("Klubbsokker 2027");
await v.clickOn(proj);
await v.shot({ hold: 1.8 });
v.note("Velger du ingen prosjekter, ser kollegaen hele bedriften", 2.4);
await proj.click(); // untick again so the form is as before
v.zoom(formZone, 0.8);
await v.shot({ hold: 0.3 });
v.move(await v.center(P().getByRole("button", { name: "Inviter" })), 0.9);
v.note("Trykk «Inviter»", 1.6);
v.zoom(null, 0.8);

v.card({ kicker: "Hva skjer nå?", text: "Kollegaen får en e-post" }, [
  "E-posten har en lenke til AllSeats.",
  "Kollegaen logger inn eller oppretter konto – og er med i bedriften.",
  "Du ser invitasjonen under Team til den er tatt imot.",
], 6.5);
v.card({ kicker: "Roller", text: "Hvem kan gjøre hva?" }, [
  "<b>Eier</b> – den som opprettet bedriften. Kan alt, også abonnementet.",
  "<b>Administrator</b> – kan invitere, endre roller, salgsfaser og innstillinger.",
  "<b>Bruker</b> – jobber med kunder, salg, tilbud og oppgaver.",
], 7.5);

await v.go("/app/team");
await v.shot({ fade: 0.5, cursor: [2000, 1300] });
v.note("Endre navn og telefon på en kollega under «Rediger»", 0.6);
const red = P().getByText("Rediger", { exact: true }).first();
await v.clickOn(red);
await P().waitForTimeout(500);
await v.shot();
v.zoom(await v.union([P().getByText("Brukere", { exact: true }).first(), P().getByRole("button", { name: "Lagre" }).first()], 90), 1.0);
v.hold(3.2);
v.zoom(null, 0.8);
v.end();
await v.finish();
