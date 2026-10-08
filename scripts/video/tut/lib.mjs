// Shared capture helpers for the tutorial videos. A video script drives the real app at 3840x2160
// (page zoomed 3x = the layout of a 1280x720 laptop screen), takes a screenshot of every state and
// records a timeline. assets.mjs renders cards/captions, render.py turns it all into a smooth 4K video.
import { createRequire } from "node:module";
import fs from "node:fs";
// Playwright from the shared tools folder in the cloud workspace, otherwise from a normal npm install
let pw;
try { pw = createRequire("/opt/npm-tools/node_modules/")("playwright"); } catch { pw = createRequire(import.meta.url)("playwright"); }
const { chromium } = pw;

export const ROOT = new URL("..", import.meta.url).pathname; // demo/
export const BASE = "https://allseats.no";
const SLOW = 1.5; // tutorial pace: cursor moves take 1.5x the default

// fresh session for every capture (each run rotates the refresh token)
export async function login() {
  const env = Object.fromEntries(fs.readFileSync(ROOT + ".env", "utf8").trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  for (let i = 0; ; i++) {
    try {
      await p.goto(BASE + "/logg-inn");
      await p.locator("input[name=email]").waitFor({ timeout: 15000 });
      await p.fill("input[name=email]", env.DEMO_EMAIL);
      await p.fill("#password", env.DEMO_PASSWORD);
      await p.locator("form:has(#password) button[type=submit]").first().click();
      await p.waitForURL(/\/app/, { timeout: 30000 });
      break;
    } catch (e) {
      if (i >= 3) throw e;
      console.log("  login retry", i + 1);
    }
  }
  await ctx.storageState({ path: ROOT + "state.json" });
  fs.chmodSync(ROOT + "state.json", 0o600);
  await b.close();
}

export async function start(slug, { loggedIn = true, lang = "nb" } = {}) {
  const dir = `${ROOT}tut/videos/${slug}/`;
  fs.rmSync(dir + "shots", { recursive: true, force: true });
  fs.mkdirSync(dir + "shots", { recursive: true });
  const EN = lang === "en";
  const browser = await chromium.launch(EN
    ? { args: ["--lang=en-GB"], env: { ...process.env, LANG: "en_GB.UTF-8", LANGUAGE: "en" } }
    : { args: ["--lang=nb-NO"], env: { ...process.env, LANG: "nb_NO.UTF-8", LANGUAGE: "nb" } });
  async function newPage(li) {
    const ctx = await browser.newContext({
      viewport: { width: 3840, height: 2160 }, locale: EN ? "en-GB" : "nb-NO", timezoneId: "Europe/Oslo",
      ...(li ? { storageState: ROOT + "state.json" } : {}),
    });
    // the app's own language switch
    await ctx.addCookies([{ name: "cfa_lang", value: EN ? "en" : "nb", domain: "allseats.no", path: "/" }]);
    await ctx.addInitScript(() => {
      const z = () => { if (document.body && document.body.style.zoom !== "3") document.body.style.zoom = "3"; };
      document.readyState === "loading" ? addEventListener("DOMContentLoaded", z) : z();
      setInterval(z, 100);
      const st = () => { if (!document.head || document.getElementById("__nc")) return; const s = document.createElement("style"); s.id = "__nc"; s.textContent = "*{caret-color:transparent!important}"; document.head.appendChild(s); };
      setInterval(st, 100);
    });
    const pg = await ctx.newPage();
    pg.__bad = false;
    pg.on("response", (r) => { if (r.status() >= 500 && r.url().includes("/_next/")) pg.__bad = true; });
    pg.on("requestfailed", (r) => { if (r.url().includes("/_next/")) pg.__bad = true; });
    return pg;
  }
  if (loggedIn) await login();
  const page = await newPage(loggedIn);
  const T = [{ meta: { lang } }];
  let n = 0;
  const ev = (e) => T.push(e);

  const api = {
    page, T, ev, dir,
    async switchTo(li) { api.page = await newPage(li); },
    autoBlur: null, // async () => [rects] applied to every shot while set
    async shot(extra = {}) {
      await api.page.waitForTimeout(200);
      // "created" history entries keep the Norwegian stage name (RLS blocks editing them)
      if (EN) await api.page.evaluate(() => {
        const M = { "Ny henvendelse": "New lead", "Kontaktet": "Contacted", "Tilbud sendt": "Quote sent", "Forhandling": "Negotiation", "Vunnet": "Won", "Tapt": "Lost" };
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (M[t]) n.nodeValue = n.nodeValue.replace(t, M[t]); }
      }).catch(() => {});
      if (api.autoBlur && !extra.blur) extra = { ...extra, blur: await api.autoBlur() };
      const f = `s${String(n++).padStart(3, "0")}.png`;
      await api.page.screenshot({ path: dir + "shots/" + f });
      ev({ shot: f, ...extra });
      return f;
    },
    async center(loc, dx, dy) {
      const y0 = await api.page.evaluate(() => scrollY);
      await loc.scrollIntoViewIfNeeded();
      if ((await api.page.evaluate(() => scrollY)) !== y0) await api.shot({ fade: 0.35 }); // page scrolled: new background
      const b = await loc.boundingBox();
      return [Math.round(b.x + (dx ?? b.width / 2)), Math.round(b.y + (dy ?? b.height / 2))];
    },
    // smallest rect around several elements
    async union(locs, pad = 60) {
      const bs = [];
      for (const l of locs) { const b = await l.boundingBox(); if (b) bs.push(b); }
      const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
      const x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height));
      return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map(Math.round);
    },
    async box(loc, pad = 0) {
      const b = await loc.boundingBox();
      return [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad].map(Math.round);
    },
    async go(path) {
      for (let i = 0; i < 4; i++) {
        api.page.__bad = false;
        const res = await api.page.goto(BASE + path).catch(() => null);
        await api.page.waitForLoadState("networkidle").catch(() => {});
        await api.page.waitForTimeout(500);
        if (!res || res.status() >= 500 || (await api.broken())) api.page.__bad = true;
        if (!api.page.__bad) return;
        console.log("  reload (asset failed):", path);
      }
      throw new Error("page assets keep failing: " + path);
    },
    async broken() {
      const t = await api.page.evaluate(() => (document.body?.innerText || "").slice(0, 200)).catch(() => "");
      return /upstream request failed|Bad Gateway|Application error/i.test(t) || t.trim() === "";
    },
    async settle(ms = 600) {
      await api.page.waitForLoadState("networkidle").catch(() => {});
      await api.page.waitForTimeout(ms);
      if (await api.broken()) api.page.__bad = true;
      for (let i = 0; i < 3 && api.page.__bad; i++) {
        console.log("  reload (asset failed) after navigation");
        api.page.__bad = false;
        await api.page.reload().catch(() => {});
        await api.page.waitForLoadState("networkidle").catch(() => {});
        await api.page.waitForTimeout(ms);
        if (await api.broken()) api.page.__bad = true;
      }
    },
    move(to, dur = 1) { ev({ move: to, dur: dur * SLOW }); },
    click(hold = 0.35) { ev({ click: true, hold }); },
    hold(s) { ev({ hold: s }); },
    title(title, sub) { ev({ title: { title, sub }, hold: 3.2 }); },
    step(label, text, hold = 1.2) { ev({ caption: { label, text }, hold }); },
    note(text, hold = 0) { ev({ caption: { text }, hold }); },
    card(title, lines, hold = 6) { ev({ card: { title, lines }, hold }); },
    zoom(rect, dur = 0.9) { ev({ zoom: rect, dur }); },     // rect [x,y,w,h] in page px, or null for full screen
    // click on an element with the visible cursor, then perform the real click
    async clickOn(loc, { hold = 0.35, dur = 1, real = true } = {}) {
      api.move(await api.center(loc), dur);
      api.click(hold);
      if (real) await loc.click();
    },
    // type text, screenshot every few characters
    async typeInto(loc, text, every = 2) {
      for (let i = 0; i < text.length; i++) {
        await loc.pressSequentially(text[i]);
        if ((i + 1) % every === 0 || i === text.length - 1) await api.shot({ hold: 0.09 * every });
      }
    },
    end(hold = 4) { ev({ end: true, fade: 0.6, hold }); },
    async finish() {
      fs.writeFileSync(dir + "timeline.json", JSON.stringify(T, null, 1));
      await browser.close();
      console.log(`${slug}: ${n} shots, ${T.length} events`);
    },
  };
  return api;
}
