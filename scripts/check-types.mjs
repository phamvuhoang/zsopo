// Fails if packages/db/src/database.types.ts drifts from the local schema.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const fresh = execSync(
  "pnpm exec supabase gen types typescript --local --schema public,core,commerce,stay,shop,content,crm,ops_config",
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const committed = readFileSync("packages/db/src/database.types.ts", "utf8");
if (fresh.trim() !== committed.trim()) {
  console.error("database.types.ts is stale: run `pnpm db:types` and commit.");
  process.exit(1);
}
console.log("check:types ok");
