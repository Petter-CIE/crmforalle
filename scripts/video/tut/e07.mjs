import { start } from "./lib.mjs";
const v = await start("en-07-email", { lang: "en" });
const P = () => v.page;
const mask = () => P().evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (/crm-[a-z0-9]{10}@/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/crm-[a-z0-9]{10}@/gi, "crm-••••••••••@");
});
const shot = async (o) => { await mask(); return v.shot(o); };
v.title("How to save e-mails in the CRM", "From Outlook, Gmail or your phone – no copying needed");
await v.go("/app");
await shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Step 1 of 3", "Open E-mail in the menu", 0.8);
await v.clickOn(P().getByRole("link", { name: "E-mail", exact: true }).first());
await P().waitForURL("**/app/e-post");
await v.settle();
await shot({ fade: 0.3 });
const addr = P().getByText(/@inn\.allseats\.no/).first();
v.zoom(await v.union([P().getByText("Your company's CRM address"), addr, P().getByText(/Save the address as a contact/).first()], 100), 0.9);
v.note("Your company has its own CRM address", 1.4);
await v.clickOn(P().getByRole("button", { name: "Copy" }).first());
await P().waitForTimeout(400);
await shot({ hold: 0.6 });
v.note("Tip: save the address as the contact «CRM» in your e-mail program", 2.8);
v.zoom(null, 0.7);
v.card({ kicker: "Step 2 of 3", text: "When you write to a customer" }, [
  "Write the e-mail as usual in Outlook, Gmail or on your phone.",
  "Add the CRM address as <b>Bcc</b> (blind copy) – the customer doesn't see it.",
  "Send. The e-mail shows up on the customer in AllSeats.",
], 6.5);
v.card({ kicker: "Step 2 of 3", text: "When you have received an e-mail" }, [
  "Forward the e-mail to the CRM address.",
  "AllSeats finds the sender and saves the e-mail on the right customer.",
], 5.5);
await v.go("/app/e-post");
await shot({ fade: 0.4, cursor: [2000, 1400] });
v.note("Under E-mail you'll find a guide for Outlook, Gmail and iPhone", 0.6);
const guide = P().getByText("How to do it in your e-mail program");
await v.clickOn(guide);
await P().waitForTimeout(600);
await shot({ hold: 0.4 });
v.zoom(await v.union([guide, guide.locator("xpath=ancestor::details[1]")], 60), 0.9);
v.hold(3.2);
v.zoom(null, 0.7);
v.step("Step 3 of 3", "The e-mail lands in the customer's history", 0.6);
await v.go("/app/bedrifter");
await shot({ fade: 0.4 });
await v.clickOn(P().getByRole("link", { name: "Tindheia Sport AS" }).first());
await P().waitForURL(/\/app\/bedrifter\/[0-9a-f-]{36}/);
await v.settle();
await shot({ fade: 0.3, hold: 0.4 });
const mail = P().getByText("Sent the price list and pictures of the wool socks.").first();
v.move(await v.center(mail), 1.0);
await shot({ hold: 0.2 });
v.zoom(await v.union([P().getByText("Activity", { exact: true }).first(), mail], 120), 0.9);
v.note("Contacts and companies are matched by e-mail address and domain", 3.2);
v.note("No match? The e-mail waits under E-mail until you add the contact", 3.4);
v.zoom(null, 0.7);
v.end();
await v.finish();
