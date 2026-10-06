import { start } from "./lib.mjs";
const v = await start("en-11-fiken", { lang: "en" });
const P = () => v.page;
v.title("How to connect Fiken", "Customers, contact persons and invoices straight into AllSeats");
v.card({ kicker: "Before you start · In Fiken", text: "Turn on Fiken's API add-on" }, [
  "Go to <b>Company → Add-on services</b> in Fiken.",
  "Turn on the <b>API</b> add-on (paid to Fiken).",
  "Without it, AllSeats is not allowed to read the data.",
], 7);
await v.go("/app/innstillinger");
await v.shot({ cursor: [2000, 1500], fade: 0.5 });
v.step("Step 1 of 3 · In AllSeats", "Go to Settings → Accounting", 0.8);
const btn = P().getByRole("link", { name: "Connect Fiken" });
v.move(await v.center(btn), 1.0);
await v.shot({ hold: 0.3 });
v.zoom(await v.union([P().getByText("Fiken", { exact: true }).first(), btn, P().getByText(/API add-on/).first()], 100), 0.9);
v.step("Step 2 of 3", "Click «Connect Fiken»", 0.6);
v.click(1.6);
v.zoom(null, 0.7);
v.card({ kicker: "Step 3 of 3 · In Fiken", text: "Log in and give access" }, [
  "You are sent to Fiken – log in as usual.",
  "Click <b>Accept</b> to give AllSeats read access.",
  "If you have several companies in Fiken, you pick the right one in AllSeats afterwards.",
], 7.5);
v.card({ kicker: "After connecting", text: "This happens automatically" }, [
  "Customers and contact persons are imported – and matched to companies by org. no.",
  "Invoices and outstanding amounts show on each customer's page.",
  "Everything updates automatically. AllSeats never changes your accounts.",
], 8);
v.end();
await v.finish();
