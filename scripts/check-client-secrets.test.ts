import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

function scan(source: string) {
  const dir = mkdtempSync(join(tmpdir(), "zsopo-bundle-"));
  try {
    writeFileSync(join(dir, "chunk.js"), source);
    return spawnSync(process.execPath, ["scripts/check-client-secrets.mjs", dir], { encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const jwt = (role: string) => [Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"), Buffer.from(JSON.stringify({ role })).toString("base64url"), "testsignature"].join(".");

it("allows SDK key-prefix checks and public environment validation messages", () => {
  expect(scan('key.startsWith("sb_secret_"); /secret|service_role/.test(key)').status).toBe(0);
});
it("rejects a complete Supabase secret key without printing the key", () => {
  const key = "sb_secret_" + "a".repeat(32);
  const result = scan(`const key = "${key}"`);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("chunk.js");
  expect(result.stderr).not.toContain(key);
});
it("rejects legacy JWTs carrying the service_role claim", () => {
  const key = jwt("service_role");
  const result = scan(`const key = "${key}"`);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("chunk.js");
  expect(result.stderr).not.toContain(key);
});
it("allows public anon JWTs", () => {
  expect(scan(`const key = "${jwt("anon")}"`).status).toBe(0);
});
