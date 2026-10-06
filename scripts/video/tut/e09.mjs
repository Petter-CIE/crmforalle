import { start } from "./lib.mjs";
const v = await start("en-09-campaigns", { lang: "en" });
const P = () => v.page;
v.title("How to send a campaign", "Newsletters and offers by e-mail to many customers at once");
await v.go("/app/e-post/kampanjer");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Step 1 of 4", "Go to E-mail → Campaigns and click «+ New campaign»", 1.0);
await v.clickOn(P().getByRole("button", { name: /New campaign/ }));
await P().waitForURL(/kampanjer\/[0-9a-f-]{36}/);
await v.settle(900);
await v.shot({ fade: 0.3, hold: 0.5 });
const name = P().locator("input[name=name]"), subject = P().locator("input[name=subject]"), body = P().locator("textarea[name=body]");
v.zoom(await v.union([name, body], 90), 0.9);
v.step("Step 2 of 4", "Write the subject and text", 0.8);
await v.clickOn(name); await name.fill(""); await v.typeInto(name, "Christmas campaign 2026", 3);
await v.clickOn(subject, { dur: 0.7 }); await v.typeInto(subject, "Club socks with your logo – order before Christmas", 4);
await v.clickOn(body, { dur: 0.7 });
await v.typeInto(body, "Hi {first_name}!\n\nYou can now order club socks with your logo for Christmas. Order by 1 December and get 10% off.", 7);
v.hold(0.4);
v.note("{first_name} and {company} are filled in for each recipient", 2.8);
v.step("Step 3 of 4", "Choose who gets the campaign", 0.6);
const kind = P().locator("select[name=kind]");
v.move(await v.center(kind), 0.9);
v.zoom(await v.union([P().getByText("Recipients", { exact: true }), P().getByText(/\d+ recipients/).first(), P().locator("select[name=owner_id]")], 90), 0.9);
v.click(0.3);
await kind.selectOption({ label: "Business customers (B2B)" });
await P().getByText("14 recipients").first().waitFor({ timeout: 10000 }).catch(() => {});
await v.settle(500);
await v.shot({ hold: 0.6 });
v.move(await v.center(P().getByText(/\d+ recipients/).first()), 0.8);
v.note("The number of recipients updates straight away", 2.6);
v.note("Private customers only get e-mails if they have consented – and anyone can unsubscribe", 3.2);
v.step("Step 4 of 4", "Check the preview, send a test – and send the campaign", 0.6);
await v.clickOn(P().getByRole("button", { name: "Save" }));
await v.settle(1500);
await v.shot({ hold: 0.3 });
const prev = P().getByText("Preview", { exact: true });
v.move(await v.center(prev), 0.9);
{
  const lb = await prev.boundingBox(), fb = await P().locator("iframe").first().boundingBox();
  v.zoom([Math.round(fb.x - 60), Math.round(lb.y - 60), Math.round(fb.width + 120), Math.round(Math.min(fb.y + 900, fb.y + fb.height) - lb.y + 60)], 0.9);
}
v.hold(3.0);
v.zoom(null, 0.7);
v.move(await v.center(P().getByRole("button", { name: "Send a test to me" })), 0.9);
v.hold(1.4);
v.move(await v.center(P().getByRole("button", { name: "Send the campaign" })), 0.7);
v.hold(1.6);
v.card({ kicker: "After sending", text: "See how it went" }, [
  "How many received it, opened it and unsubscribed.",
  "The campaign is saved in each contact's history.",
  "Replies from recipients come straight to you.",
], 6.5);
v.end();
await v.finish();
