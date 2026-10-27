# Runbook: Ops PWA ngoại tuyến và xung đột

- Ngoại tuyến chỉ cho đọc việc đã tải và ghi checklist/ghi chú/ảnh. Thanh toán, nhận/trả phòng, nghiệm thu, đổi lịch bán cần mạng.
- Thanh trạng thái hiển thị "Chờ đồng bộ (n)", "Đã đồng bộ", "Xung đột (n)", "Không có quyền (n)". Nút "Đồng bộ ngay" thử lại; mỗi thao tác có mã riêng nên thử lại không ghi trùng.
- Xung đột: một đồng nghiệp đã sửa cùng mục sau khi máy bạn tải. Mở "Xem bản máy chủ", thống nhất kết quả, ghi lại nếu cần; bỏ bản nháp khi xong. Không ghi đè im lặng.
- Không có quyền: phân công hoặc vai trò đã đổi. Báo quản lý; bản nháp được giữ trên máy tới khi bạn bỏ.
- Đăng xuất hoặc đổi tài khoản xóa dữ liệu ngoại tuyến trên thiết bị. Giấy tờ tùy thân, sổ cái, CRM không bao giờ lưu trên máy.
- Sự cố nguy hiểm/quá 15 phút: tạo sự cố mức Nguy hiểm để báo người trực ngay.
