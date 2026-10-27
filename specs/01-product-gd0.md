# Đặc tả sản phẩm GĐ0: Nền móng và vận hành Đà Lạt

Ngày: 27/10/2026. Nguồn chuẩn: `prepare/ZSOPO_PRD_Implementation Plan.html` mục 1-9 và prototype `prepare/design`. Các quyết định triển khai bổ sung được giải thích ở `../research/01-sources-decisions.md`.

## 1. Hiểu toàn bộ sản phẩm

ZSOPO nối ba trụ cột: Space (homestay, cafe/showroom, farmstay), Connect (học tập, chuyên gia, sự kiện, sản phẩm, membership) và Give (thiện nguyện, cộng đồng phụng sự). Khách lưu trú có thể mua sản phẩm, học, tư vấn rồi tham gia cộng đồng; chuyên gia mang nội dung và hoạt động tới điểm; hoạt động phụng sự tạo niềm tin và quan hệ dài hạn. Một hồ sơ khách, một hệ thống quyền, đơn hàng và sổ cái dùng chung, nhưng pháp nhân và dòng tiền tách bằng `entity_id`.

Mười một phân hệ: Content Hub, Stay & Space, Shop, Learn, Experts, Events & Retreat, Community, Membership & Growth, Give, Admin & CRM, Energy Layer. GĐ0 làm Content, Stay, Shop, Ops/Admin và bảng năng lượng công khai; GĐ1 thêm hồ sơ năng lượng, LMS miễn phí, chuyên gia/sự kiện/cộng đồng; GĐ2 thanh toán mở rộng, tư vấn, thuê bao, Give; GĐ3 marketplace, affiliate, retreat/B2B, đa điểm, warehouse; GĐ4 mobile; GĐ5 AI/nhượng quyền/quốc tế.

Tài liệu tài chính là kế hoạch kinh doanh, không phải giao dịch thật. Checklist 250 việc chứa cả pháp lý, vốn, tín dụng, tài sản, IP; nhãn P1 trong checklist không biến tất cả thành tính năng GĐ0. PRD đã chủ động đưa warehouse sang GĐ3 và loại ERP, kế toán đầy đủ, BNPL, blockchain, IoT khỏi phạm vi hiện tại.

## 2. Vai trò GĐ0

| Vai trò | Năng lực |
|---|---|
| Guest | Đọc công khai; đặt phòng/mua không cần tài khoản; xem đúng đơn qua phiên truy cập đã xác minh |
| Tài khoản khách cơ bản | Email/mật khẩu, Google, khôi phục mật khẩu; liên kết đơn sau xác minh; giỏ đồng bộ. Chưa có khu thành viên đầy đủ |
| front_desk | Booking, check-in/out, thu tiền trong quyền hạn, dịch vụ, ticket, ca của điểm được giao |
| housekeeping | Công việc dọn, checklist, ảnh, đồ vải/vật tư, báo hỏng/đồ quên; dữ liệu khách tối thiểu |
| location_manager | Phòng, giá, SOP, lịch khóa, nghiệm thu, nhân sự trong phạm vi, phê duyệt ngoại lệ |
| editor | CMS, media, lịch truyền thông; không xem dữ liệu khách/thanh toán |
| ops_finance | CRM, giao dịch, xác nhận/điều chỉnh theo quyền, báo cáo entity được giao |
| super_admin | Cấu hình hệ thống/phân quyền; truy cập nhạy cảm vẫn theo mục đích, có log |

`member_premium` là entitlement tương lai, không phải role. Mọi kiểm tra quyền gồm action + entity + location; ẩn nút không thay thế kiểm tra server/RLS.

## 3. Ma trận phạm vi bắt buộc

| PRD story | Phạm vi thực hiện và acceptance chính | Task |
|---|---|---|
| US-CNT-01 | Blog có slug, excerpt, ảnh/alt, danh mục, tác giả, thời gian đọc, related/CTA; tìm tiếng Việt không dấu; SSR/ISR, metadata, sitemap, Article; SEO ≥95 | T04,T14,T18 |
| US-CNT-02 | Markdown, ảnh, preview, draft/review/scheduled/published, lịch tuần theo kênh, lịch sử phiên bản/khôi phục | T14 |
| US-CNT-05 | Giới thiệu ba trụ cột/đội ngũ, liên hệ, bảo mật, điều khoản, nội quy, chính sách hủy/hoàn qua CMS | T04,T14 |
| US-STAY-01 | Phòng thật, năng lượng, lịch/giá/sức chứa, guest checkout, dịch vụ, cọc 30-50%, giữ 30 phút, xác nhận và handbook | T05,T06,T07 |
| US-STAY-02 | Import 15 phút/feed/phòng, export riêng tư, chặn lịch chung, cảnh báo xung đột | T08 |
| US-STAY-03 | 4 nhóm dịch vụ, lead time, giảm đặt trước 5-10%, QR trong kỳ, thêm dòng đơn, realtime xử lý | T09 |
| US-OPS-01 | LT01-LT05, trạng thái phòng, giấy tờ TTL 30 ngày, SLA 15 phút, checkout, BM01 hai bên, cảm ơn sau 24h | T10,T11 |
| US-OPS-02 | BP01-BP05, 7 bước và khu chung, BM02/BM03, đồ vải/vật tư, hỏng/đồ quên, offline | T11,T12 |
| US-SHOP-01 | 9 danh mục, biến thể, bảng năng lượng/video, bộ lọc, hai kho, hết hàng và đăng ký thông báo | T13 |
| US-SHOP-02 | Giỏ local/tài khoản, guest mua, COD/chuyển khoản, ship cố định, vòng đời đơn, phòng thiền 24h cấu hình, QR nghi lễ | T15 |
| US-ADM-01 | Dashboard 5 nguồn, công suất, ADR, booking theo kênh, đơn shop, entity/location/date | T17 |
| US-ADM-02 | CRM contact/email/phone, timeline, tag/note/source, segment động, export, chiến dịch có opt-in | T16 |
| US-ADM-04 | Mời email, role/entity/location, vô hiệu hóa, audit thao tác nhạy cảm | T03 |
| US-NRG-02 | Energy Card dùng chung: công dụng, nguồn gốc, cách dùng/nghi lễ, tần số, đá, biểu tượng, luân xa | T04,T05,T13 |

Ngoài 14 story: CI/CD, auth, migrations/RLS, orders/payments/ledger, outbox, analytics, status, backup/restore, SEO/LLMO và PWA là điều kiện nền móng bắt buộc T01-T03,T06-T08,T12,T18-T19.

## 4. Hành trình lưu trú và quy tắc

### 4.1 Khám phá, báo giá, giữ phòng

- Chỉ một điểm Đà Lạt hoạt động. `sellable=false` cho 4/13 phòng chưa kinh doanh; phòng không mở bán không có CTA đặt. Con số 13 mô tả cơ sở, không phải 13 phòng luôn có sẵn.
- Ảnh thật, loại phòng, diện tích, tiện nghi, sức chứa người lớn/trẻ em, Energy Card, giá theo đêm, khoản bao gồm, chính sách được duyệt. Tính ngày ở theo Asia/Ho_Chi_Minh; chuẩn nhận 14:00, trả trước 12:00 từ nội quy.
- Giá mỗi đêm: quy tắc ngày cụ thể/lễ ưu tiên hơn mùa, mùa hơn weekday, còn lại base. Cùng mức ưu tiên không cho hai rate trùng phạm vi. Phụ thu và giảm dịch vụ tính riêng. Tiền nguyên VND; số tiền trên server là nguồn chuẩn.
- Giá/chính sách có version. Quote chứa từng dòng/đêm, subtotal, discount, deposit, remaining, policy snapshot; hiệu lực đề xuất 10 phút. Đổi ngày/người/dịch vụ tạo quote mới. Khi giá đã đổi cần khách xác nhận lại.
- Guest nhập họ tên, phone, email, số khách, giờ đến, ghi chú, chấp thuận điều khoản riêng với opt-in marketing. Chặn bot/rate limit. `create_hold` tạo booking + order + items + reservation trong một transaction, TTL 30 phút theo đồng hồ DB.
- Cọc dùng rate cấu hình trong 30-50%; fixture dùng 30% theo prototype, không tự coi là chính sách đã được chủ cơ sở duyệt. `ceil(total * rate_bp / 10000)` làm tròn nguyên đồng.
- Cùng phòng/cùng đêm, dù web/OTA/walk-in/bảo trì, chỉ một allocation active. Không dùng kiểm tra frontend hoặc hai constraint độc lập để bảo đảm điều này.

### 4.2 Cọc và xác nhận

VietQR có tài khoản nhận đã duyệt, số tiền và mã thanh toán duy nhất. QR không chứng minh đã thu tiền. Nút “Tôi đã chuyển khoản” tạo yêu cầu kiểm tra, không đổi đơn thành paid. GĐ0 cho phép đối soát thủ công, nhân viên phải ghi giao dịch thực nhận và chứng cứ đối soát; ảnh chuyển khoản do khách gửi không đủ.

Payment state độc lập với booking: `pending -> received -> allocated` hoặc `needs_review`, `failed`; hoàn tiền qua bản ghi đảo/hoàn mới. Booking: `held -> confirmed -> checked_in -> checked_out`; `held -> expired`, `confirmed -> cancelled|no_show`. Quản lý duyệt đổi/hủy có policy snapshot và audit, không xóa lịch sử.

Các tình huống bắt buộc:

- Lặp webhook/click/xác nhận: cùng idempotency key trả cùng kết quả, chỉ một payment/ledger effect.
- Thiếu cọc: ghi nhận số đã thu, tiếp tục chờ/đối soát; không mặc định cho nợ như nút demo “thu tại quầy”. Ngoại lệ cần quyền quản lý, lý do và due amount.
- Thừa tiền: lưu toàn bộ tiền thực nhận, phần dư là nghĩa vụ với khách, không thành doanh thu; tạo việc xử lý.
- Tiền tới sau hết hold: kiểm tra và đặt lại allocation atomically nếu còn; có xung đột thì `needs_review`, không đẩy khách khác ra, quản lý xử lý đổi/hoàn.
- Mất mạng ở trang thanh toán: refresh/truy vấn lại qua phiên guest; không tạo đơn mới tự động.
- Xác nhận thanh toán, thay đổi booking, sổ cái và outbox cùng transaction. Gửi email mục tiêu trong 60 giây sau xác nhận; khi Zalo chưa được cấp thì email là kênh chạy thực, Zalo có trạng thái disabled rõ ràng.

Handbook/nội quy gửi trước nhận phòng 24 giờ theo PRD. Booking sát giờ đến nhận ngay. Hủy/đổi ngày vô hiệu job cũ. Sau checkout 24 giờ gửi cảm ơn và link Google review đã cấu hình; không triển khai điểm thưởng/phiếu review cảm xúc W-24 trong GĐ0.

### 4.3 iCal

Feed gắn từng phòng/provider, UID external ổn định; chạy mỗi 15 phút, có log lần thành công và cảnh báo sau 2 lần lỗi. Parser hỗ trợ DATE/DTSTART/DTEND exclusive, múi giờ, update/cancel, bounded recurrence nếu feed có, bỏ qua UID do chính ZSOPO xuất để tránh vòng lặp. Không lưu tên/điện thoại khách OTA trong public export.

Khi sync lỗi, giữ last-good blocks, không mở bán hàng loạt. Chỉ bỏ event mất khỏi một lần fetch đầy đủ, parse hợp lệ trong horizon đã cấu hình. Khi event OTA trùng booking direct, giữ cả bằng chứng nguồn và tạo conflict; đóng bán phần liên quan, không overwrite đơn đã trả tiền. Export có token dài có thể xoay và chỉ chứa busy interval. iCal là eventual consistency: không hứa chống mọi overbooking OTA trước lần đồng bộ kế tiếp; runbook có phòng dự phòng nếu quản lý chọn.

### 4.4 Dịch vụ

4 nhóm PRD: ẩm thực, di chuyển, trải nghiệm, tiện ích linh hoạt. Tài liệu B2B có nhóm bán kèm thứ 5: hàng vật lý ánh xạ sang Shop, đặc sản/dịch vụ phục vụ tại phòng ánh xạ nhóm flex; giữ source category để không mất ngữ nghĩa.

Mỗi dịch vụ có unit, giá, lead_time_min, khung phục vụ, đối tượng, ảnh và prebook_discount_bp 500-1000 nếu bật. Không bán hẹn giờ sớm hơn lead time. QR cố định trong phòng chỉ mở menu; quyền ghi phí cần phiên kỳ lưu trú/token do lễ tân bàn giao, không dựa vào biết số phòng. Token hết hiệu lực khi checkout/đổi khách. Request `requested -> accepted -> in_progress -> completed`; khách chỉ hủy trước accepted; phần đã ghi phí đảo bằng dòng điều chỉnh có quyền, không xóa.

## 5. LT01-LT05, BP01-BP05 và offline

| Quy trình | Đầu vào/đầu ra và kiểm soát |
|---|---|
| LT01 | Tạo booking thủ công từ Zalo/điện thoại/walk-in/OTA/B2B; lưu source, ai thu tiền; đi cùng pricing/allocation, không bypass chống trùng |
| LT02 | Đối chiếu booking/người ở, giấy tờ tối thiểu, phòng đã nghiệm thu, khoản đến hạn, khóa/mã, hướng dẫn, ký nhận, giờ giao. Không nhận phòng bẩn/chờ kiểm/bảo trì |
| LT03 | Ticket BM04: loại, ưu tiên, người nhận, timeline, deadline 15 phút, escalation và kết quả xác nhận. Nguy hiểm báo người trực ngay |
| LT04 | Bảng kê phòng + dịch vụ + điều chỉnh - tiền đã thu; xử lý công nợ/hoàn dư có quyền; thu hồi khóa/token, phòng trống bẩn, tạo housekeeping job |
| LT05 | BM01: tiền đầu + thực thu tiền mặt - chi - nộp quỹ = dự kiến; đối chiếu thực đếm, giải trình chênh lệch; tiền bank/OTA tách riêng; khóa, phòng/việc tồn; hai bên ký xác nhận |
| BP01 | 7 nhóm bước từ XLSX, bổ sung checkpoint vào phòng an toàn, tách dụng cụ/bẩn-sạch, kiểm thiết bị và tự kiểm từ 11 bước DOCX; mỗi mục pass/fail/ảnh/note |
| BP02 | Dọn đang ở có sự đồng ý, tôn trọng DND; khách từ chối ghi lịch hẹn, không tự vào |
| BP03 | Ledger đồ vải/vật tư: nhận sạch, cấp phòng, thu bẩn, giao/nhận giặt, loại/hỏng; hai bên xác nhận; tồn tối thiểu và yêu cầu bổ sung |
| BP04 | Khu chung theo điểm: bếp/BBQ/sảnh/sân vườn/hồ bơi nếu thực sự có; lịch ngày/tuần/tháng, cho N/A có lý do với khu không có |
| BP05 | BM02 tự kiểm, BM03 người nghiệm thu duyệt/không đạt/khắc phục. Chỉ approved mới làm phòng ready; lỗi an toàn khóa bán |

Tách ba chiều: cleanliness (`dirty/cleaning/awaiting_inspection/ready`), occupancy (`vacant/occupied`), sale allocation (`available/held/booked/ota/maintenance`). UI suy ra sáu trạng thái PRD; không dùng một field trạng thái để quyết định mọi thứ.

BM01-BM04 lưu template version, người làm/duyệt, timestamps và snapshot, có bản in. “Ký số” GĐ0 được đặc tả là xác nhận điện tử bằng tài khoản + thời gian + hash nội dung; không khẳng định là chữ ký số có chứng thư. Một người kiêm nhiệm phải tách bước và có lý do, quản lý kiểm tra lại; không tự động ký thay.

Lost & found có ảnh tránh PII, vị trí/giờ/người tìm, người chứng kiến, nơi cất, mã niêm phong, liên hệ xác minh, trạng thái `stored/contacted/returned/disposed`, biên nhận và người duyệt xử lý quá hạn. Không tự đặt thời hạn thanh lý khi SOP chưa duyệt.

PWA offline cho đọc công việc đã tải và ghi checklist/ảnh/ghi chú được giao. Không chốt thanh toán, check-in/out, nghiệm thu cuối hoặc đổi lịch bán khi offline. Queue có operation UUID, base_version, actor và device; retry không lặp, xung đột không ghi đè im lặng. Tách dữ liệu từng user/entity, xóa khi logout, giới hạn TTL; CCCD, ledger, full CRM không lưu cache. Sync khi mở lại app, online event và nút thử lại; không phụ thuộc Background Sync trên mọi browser.

## 6. Shop

- 9 danh mục PRD; tối thiểu 20 SKU hoàn chỉnh khi mở bán. `zs-shop-data.js` có catalogue mẫu (~24 món) chỉ để seed QA. Không dùng rating, số bán hoặc lời chứng mẫu làm dữ liệu thật.
- Product/variant có slug/SKU duy nhất, giá VND, ảnh, nguồn gốc, công dụng, cách dùng, nghi lễ/YouTube, luân xa/mục tiêu. Energy Card là điều kiện publish. Hai kho: showroom và online.
- Tồn khả dụng = on_hand - reserved. Reserve atomically khi đặt; khách tranh SKU cuối chỉ một người thành công. COD vẫn reserve. Hủy/expired release đúng một lần; shipped trừ on_hand và reserved, returned chỉ nhập lại sau kiểm hàng.
- Giỏ local cho guest, giỏ DB theo auth; merge khi login theo variant, giới hạn tồn, tính lại giá trước checkout, báo thay đổi. Client không quyết định giá/ship/discount.
- Ship default prototype 30.000 đ, miễn phí từ 500.000 đ; lưu bảng theo khu vực để quản lý đổi sau. Ngưỡng tính trên giá hàng sau giảm, chưa tính ship. Đây là fixture cần xác nhận trước mở bán.
- Checkout SĐT bắt buộc, email tùy chọn cho shop, địa chỉ theo danh mục địa bàn hiện hành cấu hình, không hard-code tên quận/phường mẫu. Guest không email xem lại bằng receipt session; muốn khôi phục truy cập dùng hỗ trợ xác minh, không dùng order code + phone như mật khẩu.
- Fulfillment `new/confirmed/packing/ritual_hold/ready_to_ship/shipped/completed/cancelled/returned`. Nếu SOP 24h bật, không sang ready_to_ship trước `ritual_started_at + 24h`. Payment status độc lập: COD shipped chưa là paid; chỉ nhận paid sau chứng cứ tiền thu/đối soát.
- Chuyển khoản pending đề xuất hạn 24h, cấu hình theo chính sách; tiền tới muộn chuyển review, không âm tồn. COD pending cần nhân viên xác nhận trong 24h hoặc liên hệ, không tự hủy đơn đã giao.
- QR lá bài dẫn tới `/la/[slug]`: hướng dẫn có bước, văn bản/media dự phòng, không cần account. Nhật ký cảm xúc và truy xuất lô đầy đủ hoãn theo PRD.

## 7. CMS, CRM, báo cáo và quản trị

CMS: Markdown an toàn, không thực thi MDX do người dùng nhập. Workflow draft -> review -> scheduled/published -> archived. Revision immutable; restore tạo revision mới. Lịch đăng theo giờ VN; chỉ publish đúng due time và đã duyệt; slug đổi có redirect 301. Preview có quyền, noindex; ảnh upload có alt, giới hạn mime/dung lượng. Lịch truyền thông có tuần/chủ đề/kênh/owner/status, import mẫu lịch một năm không tự xuất bản toàn bộ. Liên hệ lưu lead và thông báo; bản tin có opt-in/opt-out. CTA tới module chưa mở phải tắt hoặc dẫn trang giới thiệu, không link dead-end.

CRM: `customers` dùng cho guest độc lập Auth; chuẩn hóa phone/email. Trùng contact là gợi ý gộp, không chứng minh quyền sở hữu đơn. Gộp cần xác minh/nhân viên có quyền, audit, giữ nguồn và lịch sử. Timeline GĐ0 lưu trú/shop/dịch vụ, các tab học/tư vấn/điểm ẩn hoặc chưa có dữ liệu, không dựng số giả. Filter động theo lần ở, ngày gần nhất, đã mua, nguồn, tag, marketing consent. Chạy chiến dịch với recipient snapshot, kiểm lại opt-out trước gửi, rate limit, log/retry và suppression bounce. Không xây automation drip toàn nền tảng GĐ1 tại đây.

Dashboard tách **doanh thu ghi nhận**, **tiền đã thu**, **tiền cọc/nghĩa vụ**. Mỗi order item có `revenue_source`: room, beverage, own_service, product, cohost_service. Thu ngoài web được nhập order/service có chứng từ để đủ 5 nguồn mà không phải xây POS/sự kiện GĐ2. Ghi nhận phòng theo đêm đã phục vụ, dịch vụ khi completed, hàng khi completed; đảo điều chỉnh/hoàn theo event, không cộng cọc thành doanh thu. Cần tài chính duyệt quy tắc ghi nhận trước dùng báo cáo chính thức.

Công suất = room-nights occupied / room-nights sellable (trừ đêm đóng bảo trì, không trừ phòng đã bán). ADR = doanh thu phòng / room-nights bán đã phục vụ; không gồm dịch vụ/ship. Booking theo kênh và direct share có bộ lọc trạng thái rõ, loại cancelled; dashboard hiển thị kỳ và múi giờ. Tổng 5 nguồn đối chiếu ledger và báo cáo fixture, không lấy số dự toán làm thực tế.

Admin quản lý phòng/rate/service, products/inventory/orders, xác nhận tiền, ledger read/export, CMS, CRM, staff/roles, notification templates/logs, cấu hình và status. Hoàn tiền thủ công có approval/evidence ở GĐ0; payout/commission/cổng online/warehouse vẫn GĐ2-GĐ3.

## 8. Điều kiện hoàn thành

- Tất cả 14 MUST có bằng chứng test/UAT; không chỉ đủ màn hình.
- S1: 3 booking thật trước 30/11; S2: nhân viên dùng PWA một tuần, checklist ≥90% ca; S3: ≥20 SKU có Energy Card, đơn đầu tiên. Đây là kết quả thực địa cần vận hành xác nhận, không thể thay bằng seed hoặc E2E.
- Auth/RLS/storage/RPC được thử deny-case giữa hai entity, hai điểm cùng entity, guest và staff bị thu hồi quyền.
- Race booking/tồn kho/payment, iCal stale/conflict, queue offline và xóa giấy tờ đều pass; backup restore thành công trong 30 ngày.
- Các ngưỡng hiệu năng, SEO, tiếp cận và release gate trong `04-seo-quality.md` đạt, người trực và SOP được bàn giao.
