# Nguồn, quyết định và điều kiện mở bán

## 1. Thứ tự ưu tiên nguồn

1. Yêu cầu hiện tại: spec/plan trong `prod`, Next.js/Supabase/Tailwind/shadcn hiện hành, SEO/LLMO, toàn GĐ0.
2. `prepare/ZSOPO_PRD_Implementation Plan.html`: story/phase/acceptance, S0-S3, kiến trúc một lõi và entity.
3. `prepare/design/CLAUDE.md`, tokens, DS, screen HTML và flow F1-F10: visual/interaction/copy; dữ liệu demo không phải quyết định kinh doanh đã phê duyệt.
4. SOP LT/BP/BM và tài liệu hành trình: chi tiết thực hiện, an toàn, trách nhiệm; ưu tiên bảo toàn kiểm soát khi gom bước UI.
5. Digital Blueprint, kế hoạch kinh doanh/tài chính/marketing/checklist: bối cảnh dài hạn, KPI và nguồn seed/content; không tự mở rộng scope GĐ0.
6. Tài liệu chính thức hiện hành: cú pháp/API/runtime/bảo mật framework. Mọi điều chỉnh từ PRD cũ phải có lý do rõ, không âm thầm đổi yêu cầu nghiệp vụ.

Nguồn truy vết đầy đủ nằm trong [source-inventory.md](source-inventory.md). Corpus được trích HTML/Office/PDF để tìm kiếm và đối chiếu; tài liệu tài chính là snapshot/cached cell values, không chạy macro hay xác minh mô hình tài chính. Đọc prototype theo markup và logic; chưa chạy nghiệm thu hình ảnh trình duyệt của ứng dụng mới. Assets ảnh/video có provenance và mục đích sử dụng, không coi đã thẩm định nội dung/quyền khai thác chỉ vì có trong thư mục.

## 2. Tổng hợp các nhóm tài liệu gốc

| Nhóm | Điều rút ra cho hệ thống | GĐ0 / về sau |
|---|---|---|
| Kế hoạch tổng thể, trung tâm, cafe/showroom, farmstay, danh mục chung | Điểm vật lý và hàng hóa có bảng năng lượng, ba trụ cột dùng cùng khách, vật liệu/nhận diện tự nhiên | Entity/location/energy/card/catalog từ GĐ0; POS/farmstay/nhượng quyền về sau |
| Dự toán Đà Lạt 2 năm và đến 2027 | Quy mô 13 phòng/9 kinh doanh, công suất và cơ cấu 5 nguồn thu, mục tiêu doanh thu theo giai đoạn | Seed 13/9, report đúng nguồn; không đưa dự toán vào actual |
| Hành trình homestay DOCX | Khám phá -> đặt -> chuẩn bị -> trải nghiệm -> sau lưu trú, ảnh/giá minh bạch, add-ons, review | Booking, services, notifications, CRM, follow-up |
| Journey B2B XLSX (hai bản giống nội dung) | Hành trình chi tiết 7 điểm chạm, rooming/BBQ/di chuyển/đoàn, báo giá/hợp đồng và chăm sóc | Booking source B2B, service/manual order; portal/contract GĐ3 |
| SOP lễ tân/buồng phòng | LT01-LT05, BP01-BP05, BM01-BM04, không giao phòng chưa nghiệm thu, tách bán/vệ sinh, xác nhận tiền thực | Toàn bộ Ops và audit; không bỏ BM04 vì PRD nhắc ít hơn |
| Checklist dọn phòng XLSX | 7 nhóm công việc, checklist 15 dòng cho phòng/WC/khu chung | Template versioned, N/A theo tiện ích thật |
| Nội quy lưu trú | 14:00/12:00, yên tĩnh 22:00-06:00, xác minh, thanh toán, an toàn | Policy draft có nguồn; chủ cơ sở duyệt trước publish |
| Quy chuẩn năng lượng, đề xuất công cụ đo | Energy Card/công dụng/nghi lễ, Bovis là thông tin tham khảo; quy trình lô | Card GĐ0; traceability/Bovis workflow GĐ3 |
| Checklist 250 việc, sheet Holding/Operating/Finance/Capital/IP & Data | CRM, payment data, governance, warehouse, báo cáo; nhiều việc doanh nghiệp ngoài phần mềm | Dữ liệu/audit/entity từ GĐ0; warehouse GĐ3 theo PRD; tín dụng/ERP ngoài scope |
| CANVAS-TGTT, danh mục dịch vụ nền tảng, tiêu chí chuyên gia | Nhóm khách, LMS/challenge/chuyên gia, chuẩn chuyên môn/đạo đức và quy trình duyệt | Giữ architecture mở rộng; không làm quiz/recruitment/LMS GĐ0 |
| Growth hacking, kế hoạch nội dung, tài chính 2027-2028 | Freemium, học viên/giờ học, subscription, affiliate, marketing funnel | CMS/consent/analytics GĐ0; automation/thuê bao/affiliate theo phase |
| Phi lợi nhuận: mô hình, điều lệ, nội dung năm, tài chính | Sứ mệnh, cộng đồng, quỹ/phê duyệt/minh bạch | CMS giới thiệu trước; donation/campaign ledger về GĐ2 |
| Thiện nguyện/môi trường và truyền thông | Ba nhóm con người/môi trường/giáo dục, mạng lưới, bản đồ, volunteer, cho/nhận | GĐ2-GĐ3, không bê WordPress riêng vào kiến trúc đã chọn |
| Design prompt + các nhóm thiết kế web/app/DS | Có đủ tầm nhìn W01-W133, A01-A42, 10 flows, nhiều phase trong cùng file | Cắt theo ma trận màn hình, không cắt cả file hoặc đưa toàn file vào GĐ0 |

## 3. Decision log

Các mục “đề xuất” là quyết định thiết kế phục vụ bản spec này, chưa phải người dùng/chủ cơ sở đã ký duyệt chính sách production.

| ID | Mâu thuẫn hoặc khoảng trống | Quyết định cho implementation |
|---|---|---|
| D01 | PRD Next.js 15, yêu cầu dùng mới nhất | Stable snapshot Next 16.4.3/React 19.3.1/Tailwind 4.3.3; recheck+lock ở T01 |
| D02 | Blueprint có apps/admin, PRD 5.1 chọn một app | Theo PRD: một web với /ops,/admin; tách khi có nhu cầu thật |
| D03 | Migration xuất hiện hai vị trí trong sơ đồ PRD | Một lịch sử ở `supabase/migrations`, packages/db chỉ generated types/fixtures |
| D04 | Mỗi bảng bookings/blocks có exclusion riêng | Thêm room_allocations common constraint + room transaction lock; giữ raw OTA conflicts |
| D05 | PRD guest “shadow” theo phone, prototype truy cập QR chỉ nhập phòng | Customer shadow không tự tạo login; token theo order/stay, claim phải xác minh |
| D06 | Auth PRD nhiều provider, CLAUDE email chính chưa OA/SMS | GĐ0 email/password + Google nếu cấu hình, staff MFA; không làm SMS/Zalo login; Zalo notification adapter riêng |
| D07 | PRD xác nhận Zalo + email, OA chưa có | Email hoạt động, adapter Zalo sẵn; disabled có lý do, đủ credential/template mới chạy. Release note thể hiện phần chưa đạt thay vì fake success |
| D08 | Handbook PRD 1 ngày, prototype 3 ngày | Default trước 24h; booking sát giờ gửi ngay; admin cấu hình, snapshot jobs chống gửi lịch cũ |
| D09 | PRD cọc 30-50%, prototype 30% và chính sách hủy 72h/24h | Fixture 30%, policy snapshot/config; chủ điểm duyệt cọc/hủy/hoàn thực trước mở bán; không hard-code mức hoàn mẫu |
| D10 | Prototype “check-in <3 phút”, SOP 5-10 phút và bảo toàn bước | Đo thời gian, ưu tiên không bỏ xác minh/nghiệm thu; <3 phút là mục tiêu UX, không automation bỏ bước |
| D11 | Checklist XLSX 7 bước, SOP DOCX BP01 11 bước | 7 nhóm UI chứa đủ checkpoint 11 bước và BP02-BP05; BM02/BM03/BM04 có template version |
| D12 | Prototype có QR services không auth | Xem menu tự do, ghi phí cần capability kỳ lưu trú; số phòng không là credential |
| D13 | Prototype/PRD có nhiều chế độ pay, điểm/coupon trên booking | GĐ0 VietQR/manual/cash cho stay, COD/bank cho shop; ẩn loyalty/coupon/cổng GĐ2 |
| D14 | Shop ship bảng vùng PRD, prototype fixed 30k/free500k | Bảng cấu hình region; fixture default 30k/free500k, ngưỡng sau giảm trước ship; confirm policy production |
| D15 | Prototype mô tả Bovis tự dừng bán, Give/profit-share và tỷ lệ khác tài liệu gốc | Chưa thực hiện lot/profit donation rules GĐ0; card disclaimer vẫn có, không hứa chất lượng/y khoa |
| D16 | PRD pgsodium, docs mới pending deprecation | Đề xuất Edge envelope encryption/Web Crypto + managed key custody; Vault cho secrets, phải test và chốt khóa trước PII |
| D17 | PRD “Pro, PITR 7 ngày” dễ hiểu là bao gồm | PITR add-on có compute requirement; lập ngân sách thật, DB/object backup tách, restore evidence |
| D18 | CMS/policy ở S3 nhưng booking thu data từ S1 | Kéo public policy tối thiểu lên S0-S1; hoàn thiện editor/revision/calendar S3 |
| D19 | PRD “ký số” không nêu nhà cung cấp chứng thư | GĐ0 electronic acknowledgement account/time/hash; không quảng bá như chữ ký số chứng thư; nếu cần chứng thư phải bổ sung scope/integration |
| D20 | Offline prototype nói mọi thao tác lưu và sync | Offline đọc/checklist/ảnh tối thiểu, sensitive/financial/availability/inspection cuối online-only; hiển thị hạn chế rõ |
| D21 | 5 nguồn nhưng POS/Event ngoài GĐ0 | Manual/service order cùng ledger cho đồ uống/dịch vụ đồng tổ chức, không dựng POS/Events sớm |
| D22 | US-ADM-02 MUST có segment/campaign nhưng sprint viết CRM “cơ bản” | Bao gồm tag, dynamic segments, export và gửi có consent; không cắt mất acceptance bởi chữ “cơ bản” |
| D23 | Header/landing mẫu chứa stats/reviews/phone/location/tài khoản ngân hàng giả | Chỉ approved content thật trên production; feature flag và không publish demo claims |
| D24 | PRD NĐ13 là tham chiếu năm soạn, chưa đủ review pháp lý hiện hành | Giữ yêu cầu privacy/retention/consent, yêu cầu người phụ trách pháp lý duyệt trước thu dữ liệu; không đưa kết luận pháp lý mới vào spec |
| D25 | Tên Xsopo/Vsopo/TGTT vs Space/Connect/Give | Dùng ZSOPO/Space/Connect/Give cho bản thiết kế theo PRD; brand/domain chính thức là dữ liệu cần owner xác nhận |
| D26 | Backup restore có thể phục hồi CCCD đã xóa | Tombstone + replay sau restore; no phục vụ document hết TTL; key custody/crypto-erasure phải kiểm chứng |

## 4. Phụ thuộc đầu vào và đường chạy an toàn

Không cần các dữ liệu này để viết spec hoặc phát triển local với fixtures. Các gate dưới đây chỉ áp dụng khi đưa luồng tương ứng lên môi trường thật.

| Cần xác nhận/cấp | Chủ trách nhiệm đề xuất | Trước mốc | Khi chưa có |
|---|---|---|---|
| Pháp nhân nhận tiền, ngân hàng, VietQR, người đối soát/hoàn | Founder + Finance | S1 mở cọc | Sandbox fixture, không bật nhận tiền |
| Danh sách 13/9, sức chứa, ảnh, tiện nghi thật, giá/mùa/lễ/cọc/hủy/hoàn/phụ thu | Quản lý Đà Lạt | S1 mở phòng | Draft catalog, closed booking |
| Domain/brand/name/address/phone/Zalo/Maps thật | Owner thương hiệu | Public release | Staging chỉ dữ liệu gắn demo |
| Supabase/Vercel/SMTP DNS/Google OAuth/Sentry/PostHog, budget PITR/backup/key custody | CTO | S0-S1 | Local/preview không PII, không tuyên bố deploy prod |
| OA/ZNS approval/template/tokens | Marketing/Ops | Bật Zalo S1 | Email hoạt động, log disabled; báo deviation |
| Feed OTA cho phòng/provider có hỗ trợ thực tế | Front desk | S1 sync | Chặn lịch thủ công và runbook; không coi OTA đã tích hợp khi chưa feed |
| Người nghiệm thu, phân quyền kiêm nhiệm, SOP template, số trực, chính sách đồ quên | Quản lý điểm | S2 | UAT fixtures, chưa giao ca độc lập |
| ≥20 SKU thật, giá/tồn/ảnh/Energy Card, ship/đổi trả/24h SOP | Product + kho + Finance | S3 shop | Draft, không bán placeholder |
| Chính sách privacy/terms, retention, marketing, quyền sử dụng media | Pháp lý + Owner | Trước thu dữ liệu | Không bật form/checkout production |
| Quy tắc ghi nhận 5 nguồn và vốn/thu hộ/thuế/phí xuất kế toán | Finance | Dashboard thực | Gắn report UAT, không làm báo cáo chính thức |

## 5. Rủi ro và kiểm soát

Một CTO ở GĐ0 là giới hạn lớn; plan đầy đủ không làm mất rủi ro 4-6 tuần trễ được PRD nêu. Lịch chỉ được xác nhận sau S0 và burn-down. Data/media/chính sách và OA/OTA là critical dependencies ngang với code.

iCal không có cam kết realtime từ OTA nên còn cửa sổ xung đột; allocation xử lý phần hệ thống kiểm soát, đồng bộ/alert/runbook xử lý phần bên ngoài. Không chấp nhận claim “zero overbooking OTA” chỉ vì test DB pass.

Framework latest cần compatibility gate thực tế; snapshot registry không đồng nghĩa build đã kiểm chứng. T01 phải thử install/build/SSR/auth/shadcn. Nếu version mới không tương thích, ghi package/version/repro và chọn latest compatible stable có quyết định rõ, không âm thầm downgrade.

PITR, Storage backup và encryption có chi phí/độ phức tạp cao hơn giả định hạ tầng cũ; không cam kết trần chi phí Blueprint trước khi có báo giá project/traffic/retention thực.
