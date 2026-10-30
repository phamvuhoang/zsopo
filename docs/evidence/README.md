# Bằng chứng phát hành

Lưu ở đây: link CI run, kết quả test (tóm tắt), diễn tập khôi phục, báo cáo Lighthouse staging, biên bản ký duyệt. Không đưa ảnh/video giấy tờ tùy thân hay dữ liệu khách thật vào repository.

## Diễn tập khôi phục local (2026-10-27)

`scripts/restore-drill.sh` trên Supabase local:
- 0 lỗi pg_restore; bất biến khớp nguồn/đích: orders 51, ledger lines 43, tổng ledger 0 (cân), bookings 38, allocation active 32, inventory 53, giấy tờ còn hiệu lực 1, exclusion constraints 2.
- Ràng buộc chống trùng phòng còn hiệu lực sau khôi phục (chèn allocation trùng bị từ chối).
- Thời gian 4 giây (DB nhỏ). Chưa diễn tập: PITR thật, Storage, secrets/cron trên project staging. Cần làm trên staging trước mở bán.

## Bộ kiểm thử tự động (cuối GĐ0 code)

Xem `docs/releases/s3.md` mục Kiểm thử.
