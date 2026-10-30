import type { SupabaseClient } from "@supabase/supabase-js";
import { ERROR_CODES, err, ok, type DomainResult, type ErrorCode } from "@zsopo/core";

// SQL raises core.fail(code, message): SQLSTATE PT<http>, message = domain code, detail = Vietnamese copy.
type PgError = { code?: string; message: string; details?: string | null };

export function toDomainError(e: PgError): { ok: false; error: ReturnType<typeof err>["error"] } {
  const code = (e.message in ERROR_CODES ? e.message : null) as ErrorCode | null;
  if (code) return err(code, e.details || defaultMessage(code));
  if (e.code === "42501" || e.code === "PT403") return err("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  if (e.code === "PGRST301" || e.code === "PT401") return err("UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn.");
  return err("UPSTREAM_UNAVAILABLE", "Hệ thống tạm thời gián đoạn. Vui lòng thử lại.");
}

function defaultMessage(code: ErrorCode): string {
  switch (code) {
    case "SOLD_OUT": return "Phòng hoặc sản phẩm vừa hết. Vui lòng chọn lựa chọn khác.";
    case "QUOTE_EXPIRED": return "Báo giá đã hết hiệu lực. Vui lòng xem lại giá mới.";
    case "PRICE_CHANGED": return "Giá đã thay đổi. Vui lòng xác nhận lại.";
    case "HOLD_EXPIRED": return "Thời gian giữ chỗ đã hết.";
    case "RATE_LIMITED": return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    case "VERSION_CONFLICT": return "Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại.";
    default: return "Không thực hiện được yêu cầu.";
  }
}

export type Db = SupabaseClient;

/** Call a schema-qualified RPC and wrap the result in DomainResult. */
export async function call<T>(client: Db, schema: string, fn: string, args: Record<string, unknown>): Promise<DomainResult<T>> {
  const { data, error } = await client.schema(schema).rpc(fn, args);
  if (error) return toDomainError(error);
  return ok(data as T);
}
