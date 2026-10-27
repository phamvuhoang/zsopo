// Validates fixtures/seed: 13 rooms with 9 sellable, fake contacts only, no secrets.
// With --production, also rejects demo provenance (fixtures must be replaced by approved data).
import { readFileSync } from "node:fs";

const production = process.argv.includes("--production");
const rooms = JSON.parse(readFileSync("packages/db/fixtures/rooms.json", "utf8"));
const products = JSON.parse(readFileSync("packages/db/fixtures/products.json", "utf8"));
const seed = readFileSync("supabase/seed.sql", "utf8");
const problems = [];

if (rooms.rooms.length !== 13) problems.push(`expected 13 rooms, got ${rooms.rooms.length}`);
const sellable = rooms.rooms.filter((r) => r.sellable).length;
if (sellable !== 9) problems.push(`expected 9 sellable rooms, got ${sellable}`);
for (const r of rooms.rooms) if (!seed.includes(`'${r.slug}'`)) problems.push(`room ${r.slug} missing from seed.sql`);
if (products.categories.length !== 9) problems.push(`expected 9 shop categories, got ${products.categories.length}`);

const emails = seed.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
for (const e of emails) if (!e.endsWith("@example.test")) problems.push(`non-fake email in seed: ${e}`);
if (/\b0[35789]\d{8}\b/.test(seed.replace(/\b0900000\d{3}\b/g, ""))) problems.push("real-looking phone number in seed");
if (/sb_secret_|service_role|BEGIN [A-Z ]*PRIVATE KEY/.test(seed)) problems.push("secret material in seed");
if (/rating|aggregateRating|đã bán/i.test(JSON.stringify(products.products))) problems.push("demo ratings/sales in product fixture");

if (production) {
  for (const f of [rooms, products]) if (/demo|NOT approved|QA seed/i.test(f._provenance)) problems.push(`unapproved fixture: ${f._provenance}`);
  if (/chờ chủ cơ sở duyệt/.test(seed)) problems.push("placeholder address in seed");
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check:seed ok (${rooms.rooms.length} rooms, ${sellable} sellable, ${products.products.length} products)`);
