// Removes what the tutorial captures created in the demo workspace. Usage: node cleanup.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const root = new URL("..", import.meta.url).pathname;
const env = Object.fromEntries(fs.readFileSync(root + ".env", "utf8").trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const db = createClient("https://lzhqaxjlhatexerxmtxn.supabase.co", "sb_publishable_hgERd6vRSgnHMZb8hr6r2A_M3GVzqk9", { auth: { persistSession: false } });
await db.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
const WS = "5d5e18e5-843f-468e-a3bc-b1857841189b";
const out = [];
// companies created from Brønnøysund in captures (real org numbers) and their contacts
const { data: cos } = await db.from("companies").select("id,name").eq("workspace_id", WS).not("org_number", "is", null);
for (const c of cos ?? []) {
  await db.from("contacts").delete().eq("company_id", c.id);
  const { error } = await db.from("companies").delete().eq("id", c.id);
  out.push(`company ${c.name}${error ? " ERR " + error.message : ""}`);
}
// rows from the import video (Kundeliste.xlsx)
for (const dom of ["spoleberg", "tjeldvika", "havornli", "rognstua", "myrtuva"]) {
  const { data: cs } = await db.from("contacts").delete().eq("workspace_id", WS).ilike("email", `%@${dom}.example`).select("id");
  if (cs?.length) out.push(`import contacts ${dom}: ${cs.length}`);
}
for (const name of ["Spoleberg Sykkel AS", "Tjeldvika Camping", "Havørnli Fysioterapi", "Rognstua Kafé", "Myrtuva Regnskap AS"]) {
  const { data: cs } = await db.from("companies").delete().eq("workspace_id", WS).eq("name", name).select("id");
  if (cs?.length) out.push(`import company ${name}`);
}
const extra = JSON.parse(process.argv[2] ?? "{}");
for (const [table, filter] of Object.entries(extra)) {
  const { data, error } = await db.from(table).delete().eq("workspace_id", WS).match(filter).select("id");
  out.push(`${table} ${JSON.stringify(filter)}: ${data?.length ?? 0}${error ? " ERR " + error.message : ""}`);
}
await db.from("tasks").delete().eq("workspace_id", WS).eq("title", "Send tilbud på klubbsokker");
// put the dragged demo deal back (only if it moved), then drop the stage-change entries the captures left
await db.from("deals").update({ stage_id: "a6073cde-ecfb-49d8-8862-1e926e5a2b66" }).eq("workspace_id", WS).eq("title", "Ullsokker til butikken – vinter").neq("stage_id", "a6073cde-ecfb-49d8-8862-1e926e5a2b66");
await db.from("activities").delete().eq("workspace_id", WS).eq("type", "stage_change");
console.log("cleanup:", out.join(" | ") || "nothing extra");
