import { start } from "./lib.mjs";
const v = await start("en-10-tripletex", { lang: "en" });
const P = () => v.page;
v.title("How to connect Tripletex", "Customers, contact persons and invoices straight into AllSeats");
v.card({ kicker: "Step 1 of 3 · In Tripletex", text: "Create an API key" }, [
  "Go to <b>Company → Employees</b> and open your employee card.",
  "Choose the <b>API access</b> tab and click <b>New key</b>.",
  "Choose the application <b>All Seats CRM</b> and copy the key.",
], 7.5);
v.card({ kicker: "No API access tab?", text: "Order the add-on in Tripletex" }, [
  "Go to <b>Company → My subscription</b>.",
  "Order the <b>Integrations</b> add-on.",
  "The API access tab then appears on your employee card.",
], 6.5);
await v.go("/app/innstillinger");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Step 2 of 3 · In AllSeats", "Go to Settings → Accounting", 0.8);
const token = P().locator("#tt_token");
v.move(await v.center(P().locator("#regnskap")), 1.0);
await v.shot({ hold: 0.3 });
v.zoom(await v.union([P().locator("#regnskap"), token, P().getByRole("button", { name: "Connect Tripletex" })], 90), 0.9);
v.note("Paste the key from Tripletex", 0.6);
await v.clickOn(token);
await v.typeInto(token, "eyJ0b2tlbklkIjo0NTYsInRva2VuIjoi", 4);
v.hold(0.6);
v.step("Step 3 of 3", "Click «Connect Tripletex»", 0.6);
v.move(await v.center(P().getByRole("button", { name: "Connect Tripletex" })), 0.9);
v.hold(1.6);
v.note("The key is stored encrypted and is never shown again", 2.8);
v.zoom(null, 0.7);
v.card({ kicker: "After connecting", text: "This happens automatically" }, [
  "Customers and contact persons are imported – and matched to companies by org. no.",
  "Invoices and outstanding amounts show on each customer's page.",
  "Overdue invoices become a follow-up task for the account owner.",
  "Everything updates every six hours. AllSeats never changes your accounts.",
], 9);
v.card({ kicker: "Price", text: "Included in Business" }, [
  "Business: the Tripletex connection is included.",
  "Start: NOK 50/month extra.",
], 5);
v.end();
await v.finish();
