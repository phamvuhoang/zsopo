# Runbook: khóa mã hóa giấy tờ và token

## Giấy tờ tùy thân (AES-256-GCM)

- Mã hóa trong Edge Function `identity-docs`; ciphertext ở bucket private `identity`, không có policy cho anon/authenticated.
- Khóa: `DOC_ENCRYPTION_KEYS` (JSON `{kid: base64 32 byte}`) và `DOC_ENCRYPTION_KID` (khóa hiện hành) trong Supabase Edge secrets. Giá trị local trong `supabase/functions/.env` chỉ dùng phát triển.
- **Trước khi nhận giấy tờ thật**: CTO chọn nơi giữ khóa (KMS hoặc secret store có kiểm soát truy cập), lưu bản sao khóa tách khỏi backup DB, và chạy thử: mã hóa, xoay khóa, khôi phục backup, xóa theo TTL.
- Xoay khóa: thêm kid mới vào `DOC_ENCRYPTION_KEYS`, đổi `DOC_ENCRYPTION_KID`. Tài liệu cũ vẫn giải mã bằng kid cũ cho tới khi hết 30 ngày; sau đó gỡ kid cũ.
- Xóa: cron `identity-purge` hằng ngày 03:15 gọi purge; lỗi 3 lần tạo cảnh báo. Bản ghi giữ tombstone (không còn path/iv/key).
- Sau khi restore backup: chạy lại purge ngay (`select core.kick_identity_purge()`) để tài liệu đã quá hạn không được phục vụ lại. Nếu cần xóa không thể khôi phục trước hạn backup: gỡ kid tương ứng (crypto-erasure).

## Token khách và link iCal

- Guest token chỉ lưu sha256. Lộ link: thu hồi `core.guest_access_tokens.revoked_at`, gửi lại link mới qua email (worker tự tạo token khi gửi).
- Link xuất iCal lộ: Admin > Điểm > Xoay link xuất.

## Service role

- Chỉ đặt trong Edge secrets và Vault (`notify_key`). Không đặt ở Vercel/Next.js. CI kiểm `.next/static` không có `sb_secret_`/`service_role`.
