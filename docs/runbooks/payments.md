# Runbook: thanh toán và tiền treo

- Ghi tiền chỉ khi thấy tiền thực nhận (sao kê/biên nhận). Ảnh chuyển khoản khách gửi không đủ. Admin > Thanh toán > Ghi nhận tiền thực nhận (mã giao dịch ngân hàng là khóa chống ghi trùng).
- Ghi lặp cùng mã giao dịch trả cùng kết quả, không tạo bút toán thứ hai. Cùng mã nhưng khác số tiền bị từ chối: kiểm lại sao kê.
- Thiếu cọc: đặt phòng chuyển "Cần đối soát", phòng vẫn được giữ. Quản lý: thu thêm, hoặc "Xác nhận ngoại lệ" (ghi lý do + số còn phải thu), hoặc hủy và hoàn.
- Thừa tiền: phần dư là nghĩa vụ với khách (customer_credit), có việc `payment.overpaid`. Hoàn qua Yêu cầu hoàn tiền; tài chính (MFA) duyệt kèm mã giao dịch hoàn.
- Tiền tới sau khi hết giữ chỗ: hệ thống tự đặt lại phòng nếu còn trống; nếu phòng đã có khách khác, khoản tiền chuyển "Cần xử lý", không đẩy khách kia ra. Liên hệ khách để đổi phòng/ngày hoặc hoàn.
- Không bao giờ gửi lại thao tác ghi tiền "mù" khi mạng lỗi: tra lại theo mã đơn ở trang Thanh toán trước.
- Webhook cổng thanh toán đang tắt (Edge `payments` trả 503) cho tới khi có hợp đồng, khóa và kiểm thử chữ ký.
