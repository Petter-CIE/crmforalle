import { start } from "./lib.mjs";
const v = await start("11-fiken");
const P = () => v.page;

v.title("Slik kobler du til Fiken", "Kunder, kontaktpersoner og fakturaer rett inn i AllSeats");
v.card({ kicker: "Før du starter · I Fiken", text: "Slå på Fikens API-tillegg" }, [
  "Gå til <b>Foretak → Tilleggstjenester</b> i Fiken.",
  "Slå på <b>API</b>-tillegget (betales til Fiken).",
  "Uten tillegget får AllSeats ikke lov til å lese dataene.",
], 7);

await v.go("/app/innstillinger");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 1 av 3 · I AllSeats", "Gå til Innstillinger → Regnskap", 0.8);
const btn = P().getByRole("link", { name: "Koble til Fiken" });
v.move(await v.center(btn), 1.0);
await v.shot({ hold: 0.3 });
v.zoom(await v.union([P().getByText("Fiken", { exact: true }).first(), btn, P().getByText(/API-tillegg/).first()], 100), 0.9);
v.step("Steg 2 av 3", "Trykk «Koble til Fiken»", 0.6);
v.click(1.6);
v.zoom(null, 0.7);

v.card({ kicker: "Steg 3 av 3 · I Fiken", text: "Logg inn og gi tilgang" }, [
  "Du sendes til Fiken – logg inn som vanlig.",
  "Trykk <b>Godta</b> for å gi AllSeats lesetilgang.",
  "Har du flere foretak i Fiken, velger du riktig foretak i AllSeats etterpå.",
], 7.5);
v.card({ kicker: "Etter tilkoblingen", text: "Dette skjer automatisk" }, [
  "Kunder og kontaktpersoner hentes inn – og kobles til bedriftene på org.nr.",
  "Fakturaer og utestående beløp vises på kortet til hver kunde.",
  "Alt oppdateres automatisk. AllSeats endrer aldri regnskapet.",
], 8);
v.end();
await v.finish();
