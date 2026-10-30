# Checklist SEO/LLMO nội dung (trước khi mở bán)

Kỹ thuật đã có: metadata/canonical từ SITE_URL, JSON-LD (Organization, WebSite, Article, LodgingBusiness, HotelRoom, Product, BreadcrumbList), sitemap chỉ trang đã đăng, robots chặn khu riêng tư, `/llms.txt` sinh từ nội dung đã đăng, trang riêng tư noindex + no-store. Kiểm tra: `pnpm test:e2e seo accessibility`, `node scripts/check-links.mjs`, `node tests/performance/public-pages.ts`.

## Nội dung chủ cơ sở cần duyệt
- [ ] Địa chỉ, số điện thoại, Zalo, link Google Maps thật (`site.contact`, tắt `approved:false`).
- [ ] Chính sách bảo mật, điều khoản, nội quy, hủy/hoàn, giao hàng: bỏ dòng "Bản nháp", pháp lý duyệt.
- [ ] Trang Giới thiệu: đội ngũ thật, không số liệu giả.
- [ ] Ảnh phòng/sản phẩm thật có alt mô tả; không ảnh placeholder.
- [ ] Tối thiểu 20 SKU có bảng năng lượng đầy đủ (công dụng, nguồn gốc, cách dùng, nghi lễ).
- [ ] FAQ ngắn trả lời trực tiếp: ZSOPO là gì, đặt/cọc/hủy, giờ nhận/trả, ship, ý nghĩa bảng năng lượng (không lời hứa y khoa).
- [ ] Bài blog có tác giả/người biên tập, ngày cập nhật, liên kết nội bộ tới phòng/sản phẩm/chính sách bằng anchor cụ thể.

## Đo và theo dõi
- [ ] Lighthouse (median 3 lần) trên staging cho 5 template: Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 90; lưu báo cáo kèm môi trường đo, phân biệt lab và số liệu thực (RUM).
- [ ] TTFB < 300ms đo từ Việt Nam tới region Singapore (cold và warm tách riêng).
- [ ] Search Console: gửi sitemap, kiểm lập chỉ mục; không coi thiếu referral AI là không có ảnh hưởng.
- [ ] Bộ 10 câu hỏi QA (cơ sở, đặt phòng, hủy, ship, năng lượng) trả lời được từ đoạn công khai có URL nguồn.
- [ ] Chính sách crawler AI (cho phép tìm kiếm, huấn luyện hay không) do chủ nội dung quyết định, cập nhật `robots.ts`.
