// Renders the title card, step captions, text cards, cursor and end card of one video, in the app's own
// font (Geist), at 3x scale. Usage: node assets.mjs <slug>
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/opt/npm-tools/node_modules/");
const { chromium } = require("playwright");
const slug = process.argv[2];
const dir = new URL(`./videos/${slug}/`, import.meta.url).pathname;
const A = dir + "assets/";
fs.rmSync(A, { recursive: true, force: true });
fs.mkdirSync(A);
const T = JSON.parse(fs.readFileSync(dir + "timeline.json", "utf8"));
const EN = (T.find((e) => e.meta)?.meta.lang ?? "nb") === "en";
const L = EN
  ? { kind: "Tutorial", tag: "One fixed price for the whole company · All users included", cta: "Try free for 14 days – allseats.no" }
  : { kind: "Veiledning", tag: "Én fast pris for hele bedriften · Alle brukere inkludert", cta: "Prøv gratis i 14 dager – allseats.no" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 })).newPage();
await p.goto("https://allseats.no/");
await p.waitForLoadState("networkidle");
await p.evaluate(() => { document.body.innerHTML = ""; document.body.style.cssText = "margin:0;background:transparent"; document.documentElement.style.background = "transparent"; });
const render = async (html, file, sel = "#r", transparent = true) => {
  await p.evaluate((h) => { document.body.innerHTML = h; }, html);
  await p.waitForTimeout(50);
  await p.locator(sel).screenshot({ path: A + file, omitBackground: transparent });
};
const logo = (size = 44, dark = false) =>
  `<div style="width:${size}px;height:${size}px;border-radius:${size / 4}px;background:${dark ? "#fff" : "#1f6b4a"};color:${dark ? "#0f5132" : "#fff"};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size * 0.4}px">AS</div>`;

const index = { captions: [], titles: [], cards: [] };
const key = (o) => JSON.stringify(o);
for (const e of T) {
  if (e.caption && !index.captions.find((c) => key(c) === key(e.caption))) index.captions.push(e.caption);
  if (e.title) index.titles.push(e.title);
  if (e.card) index.cards.push(e.card);
}

for (const [i, c] of index.captions.entries()) {
  await render(`<div id="r" style="padding:30px;display:inline-block"><div style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;
    background:rgba(17,24,39,.94);color:#fff;padding:${c.label ? "12px 30px 16px" : "14px 30px"};border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:1060px;text-align:center">
    ${c.label ? `<div style="font-size:15px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6ee7a8">${esc(c.label)}</div>` : ""}
    <div style="font-size:27px;font-weight:600;line-height:1.25;letter-spacing:-.005em">${esc(c.text)}</div></div></div>`, `cap${i}.png`);
}
for (const [i, t] of index.titles.entries()) {
  await render(`<div id="r" style="width:1280px;height:720px;display:flex;flex-direction:column;justify-content:center;padding:0 110px;box-sizing:border-box;
      background:linear-gradient(135deg,#f7f6f2 0%,#eef4ef 100%);color:#111">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:48px">${logo(44)}<div style="font-size:22px;font-weight:600">AllSeats CRM <span style="color:#6b7280;font-weight:500">· ${L.kind}</span></div></div>
    <div style="font-size:64px;font-weight:700;letter-spacing:-.025em;line-height:1.08;max-width:1000px">${esc(t.title)}</div>
    ${t.sub ? `<div style="font-size:28px;color:#4b5563;margin-top:24px;max-width:900px;line-height:1.35">${esc(t.sub)}</div>` : ""}
    <div style="margin-top:56px;width:120px;height:8px;border-radius:4px;background:#1f6b4a"></div></div>`, `title${i}.png`, "#r", false);
}
for (const [i, c] of index.cards.entries()) {
  await render(`<div id="r" style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center;background:#e9efe9;box-sizing:border-box">
    <div style="background:#fff;border-radius:28px;box-shadow:0 20px 60px rgba(15,81,50,.12);padding:56px 64px;width:900px;box-sizing:border-box">
      <div style="font-size:18px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#1f6b4a;margin-bottom:12px">${esc(c.title.kicker ?? "")}</div>
      <div style="font-size:40px;font-weight:700;letter-spacing:-.02em;margin-bottom:30px;color:#111">${esc(c.title.text ?? c.title)}</div>
      <ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:18px">
        ${c.lines.map((l, k) => `<li style="display:flex;gap:18px;align-items:flex-start;font-size:26px;line-height:1.35;color:#1f2937">
          <span style="flex:none;width:40px;height:40px;border-radius:50%;background:#1f6b4a;color:#fff;font-weight:700;font-size:21px;display:flex;align-items:center;justify-content:center;margin-top:-2px">${k + 1}</span>
          <span>${l}</span></li>`).join("")}
      </ol></div></div>`, `card${i}.png`, "#r", false);
}
await render('<div id="r" style="width:30px;height:30px;padding:2px"><svg viewBox="0 0 24 24" width="26" height="26" style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>', "cursor.png");
await render(`<div id="r" style="width:1280px;height:720px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
    background:radial-gradient(circle at 50% 35%,#1a6b45,#0f5132 70%);color:#fff">
    <div style="display:flex;align-items:center;gap:16px">${logo(64, true)}<div style="font-weight:700;font-size:56px;letter-spacing:-.02em">AllSeats CRM</div></div>
    <div style="font-size:28px;opacity:.92">${L.tag}</div>
    <div style="margin-top:14px;font-weight:600;font-size:26px;background:#fff;color:#0f5132;padding:14px 30px;border-radius:999px">${L.cta}</div></div>`, "end.png", "#r", false);
fs.writeFileSync(A + "index.json", JSON.stringify(index));
await b.close();
console.log(`${slug}: assets ${index.captions.length} captions, ${index.titles.length} titles, ${index.cards.length} cards`);
