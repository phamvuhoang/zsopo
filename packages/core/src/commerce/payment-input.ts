// Ngày giờ nghiệp vụ là giờ Việt Nam (UTC+7, không có DST). Offset được ghi cứng để kết quả không phụ thuộc TZ của process.

const VN_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** `datetime-local` (giờ Việt Nam, YYYY-MM-DDTHH:mm) sang ISO UTC. Sai định dạng hoặc ngày không tồn tại thì throw. */
export function vnLocalToIso(local: string): string {
  if (!VN_LOCAL.test(local)) throw new Error("Thời điểm phải có dạng YYYY-MM-DDTHH:mm");
  const ms = Date.parse(`${local}:00+07:00`);
  // Date.parse có thể tràn ngày (30/02 thành 02/03): dựng lại giờ VN và so khớp với đầu vào.
  if (Number.isNaN(ms) || new Date(ms + 7 * 3_600_000).toISOString().slice(0, 16) !== local) throw new Error("Ngày giờ không hợp lệ");
  return new Date(ms).toISOString();
}

/** Mã biên nhận quầy: giữ mã người nhập; để trống thì lấy mã theo idempotency key để gửi lại cùng form không sinh mã mới. */
export function deskReceiptRef(ref: string | undefined, idempotencyKey: string): string {
  return ref?.trim() || `QUAY-${idempotencyKey}`;
}
