// Switches the demo company's own data (stage names, deals, tasks, notes, products, projects) between
// Norwegian and English for the English videos. Company and person names stay as they are.
// Usage: node translate.mjs en | nb
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/claude/crmforalle/package.json");
const { createClient } = require("@supabase/supabase-js");
const root = new URL("..", import.meta.url).pathname;
const env = Object.fromEntries(fs.readFileSync(root + ".env", "utf8").trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const db = createClient("https://lzhqaxjlhatexerxmtxn.supabase.co", "sb_publishable_hgERd6vRSgnHMZb8hr6r2A_M3GVzqk9", { auth: { persistSession: false } });
await db.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
const WS = "5d5e18e5-843f-468e-a3bc-b1857841189b";
const to = process.argv[2];
if (!["en", "nb"].includes(to)) throw new Error("usage: node translate.mjs en|nb");

const T = {
  pipeline_stages: { name: [
    ["Ny henvendelse", "New lead"], ["Kontaktet", "Contacted"], ["Tilbud sendt", "Quote sent"],
    ["Forhandling", "Negotiation"], ["Vunnet", "Won"], ["Tapt", "Lost"]] },
  projects: { name: [["Klubbsokker 2027", "Club socks 2027"], ["Julegaver bedrift", "Corporate Christmas gifts"]],
    description: [["Sokker med klubblogo til idrettslag før vintersesongen.", "Socks with club logo for sports clubs before the winter season."],
      ["Sokker med logo som julegave til ansatte og kunder.", "Socks with logo as a Christmas gift for staff and customers."]] },
  products: { name: [["Ullsokk Lofoten", "Wool sock Lofoten"], ["Sportssokk med logo", "Sports sock with logo"], ["Gaveeske 3 par", "Gift box, 3 pairs"], ["Designoppsett logo", "Logo design setup"]],
    description: [["Varm ullsokk, 80 % merinoull", "Warm wool sock, 80% merino"], ["Brodert logo, minimum 100 par", "Embroidered logo, minimum 100 pairs"],
      ["Tre par i gaveeske med kort", "Three pairs in a gift box with a card"], ["Engangskostnad for logo og prøve", "One-off cost for logo and sample"]],
    unit: [["par", "pair"], ["stk", "pcs"]] },
  deals: { title: [
    ["Klubbsokker til fotballaget, 300 par", "Club socks for the football team, 300 pairs"], ["Ullsokker til butikken – vinter", "Wool socks for the shop – winter"],
    ["Sokker med logo til skiskolen", "Logo socks for the ski school"], ["Julegave til 40 ansatte", "Christmas gift for 40 employees"],
    ["Gavesokker til hotellgjester", "Gift socks for hotel guests"], ["Sokker til turlagets medlemmer", "Socks for the hiking club members"],
    ["Julegave til kunder", "Christmas gift for customers"], ["Arbeidssokker til byggeplassen", "Work socks for the building site"],
    ["Merch til treningssenteret", "Merch for the gym"], ["Ullsokker til de ansatte", "Wool socks for the staff"]],
    lost_reason: [["Valgte en billigere leverandør", "Chose a cheaper supplier"]] },
  tasks: { title: [
    ["Ring Marte om antall og størrelser", "Call Marte about quantities and sizes"], ["Send prøve av logo til Rypefjell", "Send a logo sample to Rypefjell"],
    ["Følg opp tilbudet til Tindheia", "Follow up the quote to Tindheia"], ["Bestill gaveesker til Torvbakken", "Order gift boxes for Torvbakken"],
    ["Møte med Kobbeskjær om arbeidssokker", "Meeting with Kobbeskjær about work socks"], ["Svar på henvendelse fra Krykkjeberg Hotell", "Reply to the enquiry from Krykkjeberg Hotell"],
    ["Lever sokkene til Brisvika", "Deliver the socks to Brisvika"], ["Oppdater prisliste for 2027", "Update the price list for 2027"]] },
  contacts: { title: [
    ["Daglig leder", "Managing director"], ["Driftsleder", "Operations manager"], ["Eier", "Owner"], ["Fotballtrener", "Football coach"],
    ["HR-ansvarlig", "HR manager"], ["Hotellsjef", "Hotel manager"], ["Innkjøper", "Buyer"], ["Kontorleder", "Office manager"],
    ["Markedssjef", "Marketing manager"], ["Senterleder", "Centre manager"], ["Styreleder", "Chairman"], ["Styrer", "Head teacher"]] },
  activities: { body: [
    // "created" entries store the stage name
    ["Ny henvendelse", "New lead"], ["Kontaktet", "Contacted"], ["Tilbud sendt", "Quote sent"],
    ["Forhandling", "Negotiation"], ["Vunnet", "Won"], ["Tapt", "Lost"],
    ["Marte vil ha 300 par til A-laget og juniorene. Ønsker levering før 1. desember.", "Marte wants 300 pairs for the first team and the juniors. Delivery before 1 December."],
    ["Møte på klubbhuset. Gikk gjennom farger og logo. De vil ha blå sokker med hvit logo.", "Meeting at the clubhouse. Went through colours and logo. They want blue socks with a white logo."],
    ["Budsjett er rundt 25 000 kr. Kan bli flere par hvis prisen er riktig.", "Budget is around NOK 25,000. Could be more pairs if the price is right."],
    ["Sendt prisliste og bilder av ullsokkene.", "Sent the price list and pictures of the wool socks."],
    ["Kristian liker sokkene, men vil ha 5 % rabatt ved 300 par.", "Kristian likes the socks but wants a 5% discount for 300 pairs."],
    ["Ønsker sokker med logo til instruktørene og til salg i skiutleien.", "Wants logo socks for the instructors and for sale in the ski rental."],
    ["Silje bekreftet 40 ansatte. Gaveeske med 3 par og julekort.", "Silje confirmed 40 employees. Gift box with 3 pairs and a Christmas card."],
    ["Thomas skrev: «Vi vil gjerne ha sokker til gjestene våre i vinter.»", "Thomas wrote: «We would like socks for our guests this winter.»"],
    ["Befaring på byggeplassen. Trenger slitesterke sokker i størrelse 41–46.", "Site visit. They need hard-wearing socks in sizes 41–46."],
    ["Bestilling bekreftet: 25 gaveesker, levering uke 48.", "Order confirmed: 25 gift boxes, delivery in week 48."],
    ["Lars ringte: de har valgt en billigere leverandør i år.", "Lars called: they have chosen a cheaper supplier this year."],
    ["Per tar saken opp på neste styremøte.", "Per will bring it up at the next board meeting."]] },
};

let n = 0;
for (const [table, cols] of Object.entries(T)) {
  for (const [col, pairs] of Object.entries(cols)) {
    for (const [nb, en] of pairs) {
      const [from, val] = to === "en" ? [nb, en] : [en, nb];
      const { data, error } = await db.from(table).update({ [col]: val }).eq("workspace_id", WS).eq(col, from).select("id");
      if (error) console.log(table, col, error.message);
      n += data?.length ?? 0;
    }
  }
}
console.log(`translated to ${to}: ${n} values`);
