import { start } from "./lib.mjs";
const v = await start("en-02-invite-colleagues", { lang: "en" });
const P = () => v.page;
v.title("How to invite your colleagues", "Unlimited users – the price stays the same");
await v.go("/app");
await v.shot({ cursor: [1900, 1400], fade: 0.5 });
v.step("Step 1 of 4", "Open Team in the menu", 1.0);
await v.clickOn(P().getByRole("link", { name: "Team", exact: true }).first());
await P().waitForURL("**/app/team");
await v.settle();
await v.shot({ fade: 0.3 });
v.hold(0.8);
const formZone = await v.union([P().getByText("Invite a colleague"), P().locator("#invite_name"), P().getByRole("button", { name: "Invite" })], 90);
v.zoom(formZone, 1.0);
v.step("Step 2 of 4", "Enter name and e-mail – phone is optional", 1.0);
const nm = P().locator("#invite_name"); await v.clickOn(nm); await v.typeInto(nm, "Ingrid Haugland", 3);
const em = P().locator("#invite_email"); await v.clickOn(em); await v.typeInto(em, "ingrid@leknesokker.example", 4);
const ph = P().locator("#invite_phone"); await v.clickOn(ph); await v.typeInto(ph, "+47 900 00 123", 3);
v.hold(0.8);
v.step("Step 3 of 4", "Choose a role: User or Admin", 1.0);
await v.clickOn(P().locator("#invite_role"), { real: false });
v.hold(1.6);
v.note("Admins can also invite colleagues and change settings", 2.6);
v.zoom(await v.union([P().getByText("Invite a colleague"), P().getByText(/Choose no projects/), P().getByRole("button", { name: "Invite" }), P().getByText("Club socks 2027")], 90), 0.9);
v.step("Step 4 of 4", "Should they only see some projects? Tick them here", 1.0);
const proj = P().getByText("Club socks 2027");
await v.clickOn(proj);
await v.shot({ hold: 1.8 });
v.note("Choose no projects, and they see the whole company", 2.4);
await proj.click();
v.zoom(formZone, 0.8);
await v.shot({ hold: 0.3 });
v.move(await v.center(P().getByRole("button", { name: "Invite" })), 0.9);
v.note("Click «Invite»", 1.6);
v.zoom(null, 0.8);
v.card({ kicker: "What happens next?", text: "Your colleague gets an e-mail" }, [
  "The e-mail has a link to AllSeats.",
  "They log in or create an account – and join your company.",
  "You see the invitation under Team until it is accepted.",
], 6.5);
v.card({ kicker: "Roles", text: "Who can do what?" }, [
  "<b>Owner</b> – created the company. Can do everything, including the subscription.",
  "<b>Admin</b> – can invite, change roles, pipeline stages and settings.",
  "<b>User</b> – works with customers, deals, quotes and tasks.",
], 7.5);
await v.go("/app/team");
await v.shot({ fade: 0.5, cursor: [2000, 1300] });
v.note("Change a colleague's name and phone under «Edit»", 0.6);
await v.clickOn(P().getByText("Edit", { exact: true }).first());
await P().waitForTimeout(500);
await v.shot();
v.zoom(await v.union([P().getByText("Users", { exact: true }).first(), P().getByRole("button", { name: "Save" }).first()], 90), 1.0);
v.hold(3.2);
v.zoom(null, 0.8);
v.end();
await v.finish();
