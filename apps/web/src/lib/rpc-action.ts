import "server-only";
import { toDomainError } from "@zsopo/api";
import { updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";

/** Run a schema RPC as the signed-in user; map domain errors to Vietnamese copy; refresh cache tags. */
export async function rpcAction(schema: string, fn: string, args: Record<string, unknown>, ok: string, tags: string[] = []): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.schema(schema as "stay").rpc(fn as never, args as never);
  if (error) return { error: toDomainError(error).error.message };
  for (const t of tags) updateTag(t);
  return { status: ok };
}

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
export const int = (f: FormData, k: string) => {
  const v = str(f, k);
  return v && /^\d+$/.test(v.replace(/\./g, "")) ? Number(v.replace(/\./g, "")) : null;
};
