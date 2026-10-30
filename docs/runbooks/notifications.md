# Runbook: thông báo (outbox)

- Email là kênh chính. Zalo hiển thị "chưa bật" cho tới khi có OA/ZNS và mẫu được duyệt (không giả gửi thành công).
- Worker `notify` chạy mỗi phút (pg_cron `kick-notify`) và ngay sau khi xác nhận cọc. Retry 1/5/15/60 phút, sau 5 lần chuyển "dead".
- Admin > Thông báo: xem trạng thái từng tin; "Gửi lại" cho tin dead/failed/disabled (có nhật ký). Gửi có thể lặp tối đa một lần qua mạng (at-least-once); nhà cung cấp nhận Idempotency-Key theo dedupe key.
- Khi nhà cung cấp email sập: sửa cấu hình (`RESEND_API_KEY` trong Edge secrets), rồi gửi lại theo danh sách dead; theo dõi trùng.
- Thiết lập môi trường: Vault secrets `notify_url`, `notify_key` (service key chỉ ở Vault/Edge), `revalidate_url`, `revalidate_secret`; Edge secrets `SITE_URL`, `MAIL_FROM`, `RESEND_API_KEY`.
