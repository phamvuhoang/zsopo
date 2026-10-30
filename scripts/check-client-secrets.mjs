// Scan emitted files, allowing SDK prefix checks while refusing complete elevated keys.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function elevated(source) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(source)) return true;
  for (const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role") return true;
    } catch { /* Not a JWT payload. */ }
  }
  return false;
}

function scan(dir) {
  let failed = false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) failed = scan(path) || failed;
    else if (entry.isFile() && elevated(readFileSync(path, "utf8"))) {
      console.error(`Elevated credential found in ${path}`); // Never print the credential.
      failed = true;
    }
  }
  return failed;
}

if (scan(process.argv[2] ?? "apps/web/.next/static")) process.exit(1);
console.log("check:client-secrets ok");
