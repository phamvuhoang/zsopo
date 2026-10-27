import { expect, it } from "vitest";
import { drainQueue } from "./queue-loop";

const op = (id: string) => ({ operationId: id });

it("lỗi nghiệp vụ của một thao tác không chặn các thao tác sau; lỗi mạng thì dừng để thử lại", async () => {
  const updates: [string, string][] = [];
  const apply = async (o: { operationId: string }) => {
    if (o.operationId === "bad") return { error: "VALIDATION" };
    if (o.operationId === "net") throw new Error("Failed to fetch");
    return { state: "applied" as const };
  };
  await drainQueue([op("a"), op("bad"), op("b"), op("net"), op("c")], apply, async (o, patch) => void updates.push([o.operationId, patch.status]));
  expect(updates).toEqual([["a", "syncing"], ["a", "applied"], ["bad", "syncing"], ["bad", "rejected"], ["b", "syncing"], ["b", "applied"], ["net", "syncing"], ["net", "queued"]]);
});

it("ghi lại version server trả về để thao tác sau (BM02) dùng đúng version", async () => {
  const patches: unknown[] = [];
  await drainQueue([op("a")], async () => ({ state: "applied" as const, version: 7 }), async (_, p) => void patches.push(p));
  expect(patches.at(-1)).toEqual({ status: "applied", serverVersion: 7 });
});
