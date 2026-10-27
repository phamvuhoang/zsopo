export type QueueStatus = "queued" | "syncing" | "applied" | "conflict" | "forbidden" | "rejected";
type Result = { state: "applied" | "duplicate" | "conflict" | "forbidden" } | { error: string };

/**
 * Drain offline operations in order. A server rejection ({error}) marks that op "rejected" and moves on;
 * a thrown error (network) puts it back to "queued" and stops so the next trigger retries.
 */
export async function drainQueue<T extends { operationId: string }>(
  ops: T[],
  apply: (op: T) => Promise<Result>,
  update: (op: T, patch: { status: QueueStatus; lastError?: string }) => Promise<void>,
): Promise<void> {
  for (const op of ops) {
    await update(op, { status: "syncing" });
    let r: Result;
    try {
      r = await apply(op);
    } catch (e) {
      await update(op, { status: "queued", lastError: e instanceof Error ? e.message : String(e) });
      return;
    }
    if ("error" in r) await update(op, { status: "rejected", lastError: r.error });
    else await update(op, { status: r.state === "duplicate" ? "applied" : r.state });
  }
}
