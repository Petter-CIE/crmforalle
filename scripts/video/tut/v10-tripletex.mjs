import { start } from "./lib.mjs";
const v = await start("10-tripletex");
const P = () => v.page;

v.title("Slik kobler du til Tripletex", "Kunder, kontaktpersoner og fakturaer rett inn i AllSeats");
v.card({ kicker: "Steg 1 av 3 · I Tripletex", text: "Lag en API-nøkkel" }, [
  "Gå til <b>Selskap → Ansatte</b> og åpne ansattkortet ditt.",
  "Velg fanen <b>API-tilgang</b> og trykk <b>Ny nøkkel</b>.",
  "Velg applikasjonen <b>All Seats CRM</b> og kopier nøkkelen.",
], 7.5);
v.card({ kicker: "Ser du ikke fanen API-tilgang?", text: "Bestill tilleggstjenesten i Tripletex" }, [
  "Gå til <b>Selskap → Mitt abonnement</b>.",
  "Bestill tilleggstjenesten <b>Integrasjoner</b>.",
  "Da dukker fanen API-tilgang opp på ansattkortet.",
], 6.5);

await v.go("/app/innstillinger");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 2 av 3 · I AllSeats", "Gå til Innstillinger → Regnskap", 0.8);
const token = P().locator("#tt_token");
v.move(await v.center(P().locator("#regnskap")), 1.0);
await v.shot({ hold: 0.3 });
v.zoom(await v.union([P().locator("#regnskap"), token, P().getByRole("button", { name: "Koble til Tripletex" })], 90), 0.9);
v.note("Lim inn nøkkelen fra Tripletex", 0.6);
await v.clickOn(token);
await v.typeInto(token, "eyJ0b2tlbklkIjo0NTYsInRva2VuIjoi", 4);
v.hold(0.6);
v.step("Steg 3 av 3", "Trykk «Koble til Tripletex»", 0.6);
v.move(await v.center(P().getByRole("button", { name: "Koble til Tripletex" })), 0.9);
v.hold(1.6);
v.note("Nøkkelen lagres kryptert og vises aldri igjen", 2.8);
v.zoom(null, 0.7);

v.card({ kicker: "Etter tilkoblingen", text: "Dette skjer automatisk" }, [
  "Kunder og kontaktpersoner hentes inn – og kobles til bedriftene på org.nr.",
  "Fakturaer og utestående beløp vises på kortet til hver kunde.",
  "Forfalte fakturaer blir en oppfølgingsoppgave for kundeansvarlig.",
  "Alt oppdateres hver sjette time. AllSeats endrer aldri regnskapet.",
], 9);
v.card({ kicker: "Pris", text: "Inkludert i Bedrift" }, [
  "Bedrift: Tripletex-koblingen er inkludert.",
  "Start: 50 kr/mnd i tillegg.",
], 5);
v.end();
await v.finish();
