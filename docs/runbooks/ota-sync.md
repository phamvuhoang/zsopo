# Runbook: đồng bộ lịch OTA (iCal)

iCal là eventual consistency: OTA chỉ được đọc mỗi 15 phút (pg_cron `ical-sync`). Hệ thống không cam kết chống mọi trùng phòng với OTA trong khoảng giữa hai lần đồng bộ.

## Thiết lập một kết nối

1. Admin > Điểm Đà Lạt > Đồng bộ lịch OTA > Thêm kết nối: chọn phòng, kênh, dán link iCal xuất của OTA (https). Link được lưu chỉ ghi, không hiển thị lại.
2. Bấm "Tạo link xuất", sao chép link (chỉ hiện một lần) vào extranet OTA phần nhập lịch.
3. Host OTA phải nằm trong allowlist (`ops_config.runtime_settings` key `calendar.allowedHosts`, mặc định airbnb, booking, agoda, expedia, vrbo, google).

## Khi đồng bộ lỗi

- Hệ thống giữ lịch đã đồng bộ thành công gần nhất (không mở bán hàng loạt).
- Lỗi 2 lần liên tiếp tạo cảnh báo `calendar.sync_failed` tới email vận hành.
- Việc cần làm: kiểm tra link còn hiệu lực trên OTA; nếu OTA sập kéo dài, khóa lịch thủ công các ngày cao điểm (Khóa lịch > loại Chủ dùng) và đối chiếu bằng extranet.

## Khi có xung đột (OTA trùng đặt phòng trực tiếp)

- Đặt phòng đã thu tiền không bị ghi đè. Các đêm OTA còn trống vẫn bị đóng bán.
- Quản lý chọn: chuyển một bên sang phòng dự phòng tương đương, hoặc liên hệ khách OTA để hủy/đổi qua extranet, hoặc hoàn tiền theo chính sách. Ghi "Cách xử lý" để đóng xung đột (có nhật ký).
- Nếu quản lý chọn giữ phòng dự phòng, khóa lịch phòng đó trong mùa cao điểm.

## Lộ link xuất

Bấm "Xoay link xuất": link cũ trả 401 ngay. Cập nhật link mới trên OTA.
