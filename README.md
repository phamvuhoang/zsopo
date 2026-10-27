# ZSOPO GĐ0 - Bộ đặc tả và kế hoạch triển khai

Ngày lập: 27/10/2026. Đầu ra: tài liệu để triển khai codebase và toàn bộ GĐ0, chưa phải ứng dụng đã xây hoặc đã triển khai.

## Thứ tự đọc

1. [Phạm vi sản phẩm và nghiệm thu](specs/01-product-gd0.md): toàn cảnh ba trụ cột, 14 story MUST GĐ0, nghiệp vụ và ngoại lệ.
2. [Kiến trúc codebase, dữ liệu và bảo mật](specs/02-architecture.md): Next.js, Supabase, Tailwind, shadcn, transaction, RLS và offline.
3. [Màn hình và prototype](specs/03-prototype-map.md): màn hình GĐ0, route, phần giữ lại và phần hoãn.
4. [SEO, LLMO và chất lượng](specs/04-seo-quality.md): render, metadata, khả năng đọc bằng máy, performance, kiểm thử và phát hành.
5. [Kế hoạch S0-S3](plans/01-implementation-plan.md): thứ tự phụ thuộc, file, interface, test và deliverable.
6. [Nguồn và quyết định](research/01-sources-decisions.md): tài liệu nguồn, mâu thuẫn, giả định và điều kiện mở bán.
7. [Phiên bản và tài liệu online](research/02-stack-research.md): snapshot registry, nguồn chính thức, cách cập nhật trước implementation.
8. [Danh mục nguồn](research/source-inventory.md): đường dẫn và dấu vết toàn bộ tài liệu/prototype trong `prepare`.

## Quyết định tổng thể

Dùng một monorepo pnpm/Turborepo, một app Next.js cho web công khai, `/ops` PWA và `/admin`; một Supabase project cho mỗi môi trường. Dùng chung `core`, `db`, `api`, `ui`, `config`; không scaffold mobile ở GĐ0. Giữ mô hình entity và đơn hàng thống nhất từ PRD.

GĐ0 chạy một điểm Đà Lạt: seed 13 phòng, chỉ 9 phòng có quyền bán; CMS, booking/iCal, dịch vụ, LT01-LT05, BP01-BP05, shop, CRM, dashboard và quản trị đủ hoạt động thật. Prototype là chuẩn thiết kế, PRD là chuẩn phạm vi. Mọi chỗ bổ sung kỹ thuật hoặc chưa có quyết định kinh doanh đều được đánh dấu trong tài liệu.

Mốc PRD giữ nguyên: S0 03-14/11, S1 17-28/11, S2 01-12/12, S3 15-28/12/2026. Đây là mục tiêu lập kế hoạch, không phải cam kết đã xác nhận năng lực. Không hạ phạm vi MUST để ép lịch.

## Trạng thái bàn giao

- Đã lập spec/plan và đối chiếu các story MUST GĐ0 với task, màn hình và tiêu chí nghiệm thu.
- Chưa cài dependencies của sản phẩm, tạo database, chạy test ứng dụng hay deploy. Các lệnh/test trong plan là công việc khi triển khai.
- Dữ liệu mẫu được dùng cho local/staging. Mở bán thật cần dữ liệu đã duyệt: pháp nhân/ngân hàng, phòng/giá/chính sách, liên hệ, sản phẩm, hạ tầng và người trực.
- `prepare` là kho tham khảo có Git riêng; `prod` hiện chưa có Git. Không sửa `prepare`, không tự tạo commit cho tài liệu ở repository khác.
