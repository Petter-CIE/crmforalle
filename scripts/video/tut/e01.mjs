import { start } from "./lib.mjs";
const v = await start("en-01-get-started", { loggedIn: true, lang: "en" });

v.title("How to get started", "Create your account and company – it takes a couple of minutes");
await v.switchTo(false);
await v.go("/");
await v.shot({ cursor: [1900, 1500], fade: 0.5 });
v.step("Step 1 of 4", "Go to allseats.no and click «Try free for 14 days»", 1.6);
await v.clickOn(v.page.getByRole("link", { name: "Try free for 14 days" }).first());
await v.page.waitForURL("**/registrer");
await v.settle();
await v.shot({ fade: 0.3 });
v.zoom(await v.union([v.page.getByText("Create account", { exact: true }).first(), v.page.getByRole("button", { name: "Create account" })], 80), 1.0);
v.step("Step 2 of 4", "Enter your e-mail and choose a password", 1.2);
const email = v.page.locator("input[name=email]");
await v.clickOn(email);
await v.shot();
await v.typeInto(email, "ingrid@leknesokker.example", 3);
const pw = v.page.locator("input[name=password]");
await v.clickOn(pw);
await v.typeInto(pw, "secret12345", 3);
v.hold(0.6);
v.move(await v.center(v.page.getByRole("button", { name: "Create account" })), 0.8);
v.hold(1.8);
v.note("You can also use your Microsoft or Google account", 0);
v.move(await v.center(v.page.getByText("Continue with Microsoft")), 0.9);
v.hold(2.4);
v.zoom(null, 0.8);
v.card({ kicker: "Step 3 of 4", text: "Confirm your e-mail" }, [
  "You get an e-mail from AllSeats within a minute.",
  "Click the link in the e-mail.",
  "AllSeats opens, and you can set up your company.",
], 6);

await v.switchTo(true);
await v.go("/kom-i-gang");
await v.shot({ cursor: [1900, 1700] });
v.zoom(await v.union([v.page.getByText("Set up your company"), v.page.getByRole("button", { name: /Create and start/ })], 70), 1.0);
v.step("Step 4 of 4", "Enter your name and find your company in the Norwegian business register", 1.6);
const name = v.page.locator("#full_name");
await v.clickOn(name);
await name.fill("");
await v.shot({ hold: 0.3 });
await v.typeInto(name, "Ingrid Haugland", 3);
const search = v.page.getByPlaceholder("Search by company name or org. no.");
await v.clickOn(search);
await v.typeInto(search, "CIE AS", 1);
const opt = v.page.getByRole("option").filter({ hasText: /^\s*CIE AS/i }).first();
await opt.waitFor({ timeout: 15000 });
await v.page.waitForTimeout(500);
await v.shot({ hold: 1.2 });
await v.clickOn(opt);
await v.page.waitForTimeout(600);
await v.shot({ hold: 0.6 });
v.note("Name and organisation number are filled in for you", 2.2);
const terms = v.page.locator("input[name=accept_terms]");
await v.clickOn(terms);
await v.shot({ hold: 0.6 });
v.move(await v.center(v.page.getByRole("button", { name: /Create and start/ })), 0.9);
v.note("Click «Create and start the trial»", 2.4);
v.zoom(null, 0.8);
await v.go("/app");
await v.shot({ fade: 0.5, cursor: [2600, 1500] });
v.note("Done! The checklist shows you what to do first", 0.6);
v.zoom(await v.union([v.page.getByText("Get started", { exact: true }).first(), v.page.getByText("Register your first deal"), v.page.getByText(/Invite your colleagues/)], 70), 1.1);
v.hold(3.2);
v.zoom(null, 0.8);
v.end();
await v.finish();
