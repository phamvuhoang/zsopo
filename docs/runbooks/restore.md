# Runbook: khôi phục dữ liệu

1. Tuyên bố sự cố, bật bảo trì (tắt đặt phòng/đặt hàng: unpublish chính sách bảo mật/điều khoản sẽ đóng mọi biểu mẫu thu dữ liệu).
2. Khôi phục vào môi trường cô lập trước (PITR hoặc snapshot logic). Diễn tập local: `scripts/restore-drill.sh` (dump schema nghiệp vụ, khôi phục vào DB riêng, so bất biến, kiểm ràng buộc chống trùng phòng).
3. Sau khôi phục: chạy `select core.kick_identity_purge()` để giấy tờ quá hạn không được phục vụ lại; kiểm `stay.identity_documents` không còn bản quá hạn có path.
4. Đối soát giao dịch sau mốc khôi phục: so sao kê ngân hàng với `commerce.payments` (provider_ref), ghi lại khoản thiếu bằng Ghi nhận tiền (idempotent theo mã giao dịch).
5. Outbox: đánh dấu các tin đã gửi trước sự cố là sent theo nhật ký nhà cung cấp để không gửi lại thật.
6. Storage: DB backup không gồm file. Khôi phục bucket `media`, `evidence`, `identity` từ bản sao lưu object riêng; khóa giải mã giấy tờ phải lấy từ nơi giữ khóa độc lập.
7. Promote, theo dõi 48 giờ. Chỉ incident commander quyết định PITR. RPO mục tiêu 15 phút (cần PITR add-on), RTO mục tiêu 4 giờ (đo trong diễn tập, không phải SLA nhà cung cấp).
