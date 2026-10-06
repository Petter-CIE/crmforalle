import { start } from "./lib.mjs";
const v = await start("09-kampanjer");
const P = () => v.page;

v.title("Slik sender du en kampanje", "Nyhetsbrev og tilbud på e-post til mange kunder på en gang");
await v.go("/app/e-post/kampanjer");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Steg 1 av 4", "Gå til E-post → Kampanjer og trykk «+ Ny kampanje»", 1.0);
await v.clickOn(P().getByRole("button", { name: /Ny kampanje/ }));
await P().waitForURL(/kampanjer\/[0-9a-f-]{36}/);
await v.settle(900);
await v.shot({ fade: 0.3, hold: 0.5 });

const name = P().locator("input[name=name]"), subject = P().locator("input[name=subject]"), body = P().locator("textarea[name=body]");
v.zoom(await v.union([name, body], 90), 0.9);
v.step("Steg 2 av 4", "Skriv emne og tekst", 0.8);
await v.clickOn(name);
await name.fill("");
await v.typeInto(name, "Julekampanje 2026", 3);
await v.clickOn(subject, { dur: 0.7 });
await v.typeInto(subject, "Klubbsokker med logo – bestill før jul", 4);
await v.clickOn(body, { dur: 0.7 });
await v.typeInto(body, "Hei {fornavn}!\n\nNå kan dere bestille klubbsokker med logo til jul. Bestill innen 1. desember, så får dere 10 % rabatt.", 7);
v.hold(0.4);
v.note("{fornavn} og {firma} fylles inn for hver mottaker", 2.8);

v.step("Steg 3 av 4", "Velg hvem som skal få kampanjen", 0.6);
const kind = P().locator("select[name=kind]");
v.move(await v.center(kind), 0.9);
v.zoom(await v.union([P().getByText("Mottakere", { exact: true }), P().getByText(/\d+ mottakere/).first(), P().locator("select[name=owner_id]")], 90), 0.9);
v.click(0.3);
await kind.selectOption({ label: "Bedriftskunder (B2B)" });
await P().getByText("14 mottakere").first().waitFor({ timeout: 10000 }).catch(() => {});
await v.settle(500);
await v.shot({ hold: 0.6 });
v.move(await v.center(P().getByText(/\d+ mottakere/).first()), 0.8);
v.note("Antallet mottakere oppdateres med en gang", 2.6);
v.note("Privatkunder får bare e-post når de har samtykket – og alle kan melde seg av", 3.2);

v.step("Steg 4 av 4", "Sjekk forhåndsvisningen, send en test – og send kampanjen", 0.6);
await v.clickOn(P().getByRole("button", { name: "Lagre" }));
await v.settle(1500);
console.log("after save, Type shows:", await P().locator("select[name=kind]").evaluate((s) => s.options[s.selectedIndex].text), "| count:", await P().getByText(/\d+ mottakere/).first().innerText());
await v.shot({ hold: 0.3 });
const prev = P().getByText("Forhåndsvisning", { exact: true });
v.move(await v.center(prev), 0.9);
{
  const lb = await prev.boundingBox(), fb = await P().locator("iframe").first().boundingBox();
  v.zoom([Math.round(fb.x - 60), Math.round(lb.y - 60), Math.round(fb.width + 120), Math.round(Math.min(fb.y + 900, fb.y + fb.height) - lb.y + 60)], 0.9);
}
v.hold(3.0);
v.zoom(null, 0.7);
v.move(await v.center(P().getByRole("button", { name: "Send test til meg" })), 0.9);
v.hold(1.4);
v.move(await v.center(P().getByRole("button", { name: "Send kampanjen" })), 0.7);
v.hold(1.6);
v.card({ kicker: "Etter utsendelsen", text: "Du ser hvordan det gikk" }, [
  "Hvor mange som har fått, åpnet og meldt seg av.",
  "Utsendelsen lagres i historikken til hver kontakt.",
  "Svar fra mottakerne kommer rett til deg.",
], 6.5);
v.end();
await v.finish();
