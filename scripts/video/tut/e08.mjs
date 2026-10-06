import { start } from "./lib.mjs";
const v = await start("en-08-import", { lang: "en" });
const P = () => v.page;
v.title("How to import your customers", "From Excel or CSV – in a couple of minutes");
await v.go("/app/kontakter");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Step 1 of 3", "Go to Contacts or Companies and click «Import»", 1.0);
await v.clickOn(P().getByRole("link", { name: /Import/ }).first());
await P().waitForURL("**/app/import**");
await v.settle();
await v.shot({ fade: 0.3, hold: 0.6 });
v.move(await v.center(P().getByText("Download the Excel template with instructions")), 0.9);
v.note("No file yet? Download the template – it explains the columns", 2.8);
v.step("Step 2 of 3", "Choose your Excel or CSV file", 0.6);
await v.clickOn(P().getByText("Choose file"), { real: false });
await P().locator("input[type=file]").setInputFiles(v.dir + "../../Customers.xlsx");
await P().getByText("Match the columns").waitFor();
await v.settle(600);
await v.shot({ hold: 0.6 });
v.move(await v.center(P().getByLabel("Field in the CRM: Company name")), 1.0);
v.zoom(await v.union([P().getByText("Match the columns"), P().getByLabel("Field in the CRM: Phone")], 80), 0.9);
v.note("AllSeats guesses what the columns mean – fix anything that's wrong", 3.2);
v.zoom(null, 0.6);
v.move(await v.center(P().getByLabel("Field in the CRM: Contact person")), 0.9);
v.zoom(await v.union([P().getByLabel("Field in the CRM: Address"), P().getByLabel("Field in the CRM: Contact person"), P().getByText("Contact person", { exact: true }).first()], 90), 0.9);
v.note("«Contact person» is split into first and last name automatically", 3.0);
v.zoom(null, 0.7);
v.step("Step 3 of 3", "Click «Import»", 0.6);
await v.clickOn(P().getByRole("button", { name: /Import \d+ rows/ }));
await P().waitForTimeout(3000);
await v.settle(800);
await v.shot({ hold: 0.4 });
v.zoom(await v.union([P().getByText("The import is finished"), P().getByRole("link", { name: /Go to contacts/ }).or(P().getByRole("button", { name: /Go to contacts/ })).first()], 120), 0.9);
v.note("New companies are created – and e-mails that already exist are skipped", 3.2);
v.zoom(null, 0.6);
await v.go("/app/bedrifter");
await v.shot({ fade: 0.4, hold: 0.4 });
v.move(await v.center(P().getByText("Spoleberg Sykkel AS").first()), 1.0);
v.note("Done! Your customers are now in AllSeats", 3.0);
v.card({ kicker: "Tip", text: "Would you rather we did it?" }, [
  "Send the file to post@allseats.no.",
  "We import your customers for NOK 150 excl. VAT.",
  "Any format works – including exports from another system.",
], 6);
v.end();
await v.finish();
