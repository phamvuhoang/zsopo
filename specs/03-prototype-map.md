# Bản đồ prototype, route và trạng thái GĐ0

Nguồn: `prepare/docs/ZSOPO_Claude_Design_Prompt.txt`, các file `prepare/design/Web *.dc.html`, `ZSOPO Prototype F1-F10.dc.html`, `ZS Web Header.dc.html`, `tokens/zsopo-tokens.json` và `CLAUDE.md`. Bản đồ dựa trên nội dung, markup và logic prototype; chưa phải kết quả visual regression của ứng dụng thật.

## 1. Chuẩn chuyển prototype thành sản phẩm

Giữ bố cục, hierarchy, typography, màu, khoảng trắng, Energy Card, filter drawer, sticky booking/cart summary, desktop/mobile và light/dark. Chuyển canvas 1440/390 thành responsive thực ở 390/834/1440, thêm kiểm tra 320px và zoom 200%. Loại bỏ thanh điều khiển demo, nút “mô phỏng”, nội dung `{{ ... }}`, placeholder ảnh và số liệu mẫu khỏi production.

Header dùng chung theo reference, một component có facade/active. GĐ0 CTA chính đặt phòng, shop, blog; Connect/Give có trang giới thiệu thật qua CMS, không điều hướng vào quiz, quyên góp hoặc khoá học chưa phát hành. Không đưa testimonial, rating, 40+ chuyên gia, số quyên góp, số đoàn đã đón giả vào HTML/JSON-LD.

Tokens: background light #FAF8FC, accent #5A3889, Space wood #74503A, Give olive #56622B; full light/dark lấy JSON, không chép riêng từng trang. Font Lexend + Be Vietnam Pro + JetBrains Mono; min body/form 14px, target 44px; radius 4/8/12/full theo token. Luân xa chỉ là mã màu nội dung, luôn kèm label; icon Lucide nét 1.5. Reduced motion tắt vòng thở/trang trí. Pill/chip/giá `white-space:nowrap; flex:none`. Không em dash/en dash trong copy mới. Giá `1.250.000 đ`.

Logo dùng assets đã có làm reference: ZSOPO hướng 1b, Zen hướng 1d; chưa giả định đã có SVG vector cuối. Ảnh mặt tiền/video thật trong `assets`; room/product media phải được chủ nội dung duyệt. Energy Card giữ disclaimer “Nội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa”; Bovis nếu hiện có ghi “chỉ số tham khảo theo phương pháp đo của ZSOPO”. Không suy thành chứng nhận an toàn/y khoa.

## 2. Màn hình trong phạm vi

Route dưới đây là đích triển khai đề xuất. `W-*` là ID truy vết, không đưa vào giao diện khách.

| ID | Route | Phạm vi GĐ0 | Task |
|---|---|---|---|
| W-01 | `/` | Hero/ba trụ cột, Space/shop/blog, liên hệ/bản tin; khối tương lai có flag | T04 |
| W-02 | `/gioi-thieu` | Tầm nhìn, đội ngũ, ba trụ cột, nội dung CMS | T04,T14 |
| W-03 | `/blog`, `/blog/danh-muc/[slug]` | Listing/filter/pagination/search | T14 |
| W-04 | `/blog/[slug]` | Bài, mục lục, author/date, related/CTA | T14 |
| W-08 | `/lien-he` | Form lead, thông tin đã duyệt, link Maps | T04,T14 |
| W-09 | `/chinh-sach/[slug]` | Bảo mật, điều khoản, nội quy, hủy/hoàn, giao hàng | T04,T14 |
| W-10 | `/tim-kiem` | Search bài/phòng/sản phẩm đang published; không search dữ liệu riêng | T14,T18 |
| W-11 | not-found/error/global-error | 404, lỗi retry, mã hỗ trợ, không lộ stack | T01,T04 |
| W-12 | `/stay` | Giới thiệu Space và điểm đang mở | T05 |
| W-13 | `/stay/da-lat` | Điểm/ảnh/video/Energy Card/liên hệ/chính sách | T05 |
| W-14 | `/stay/da-lat/phong` | Danh sách phòng, ngày/khách, availability | T05 |
| W-15 | `/stay/da-lat/phong/[slug]` | Gallery, tiện nghi, energy, giá/chính sách/calendar | T05 |
| W-16 | `/dat-phong?room=...` bước ngày | Chọn ngày/người, sức chứa, quote | T05,T07 |
| W-17 | `/dat-phong` bước dịch vụ | 4 nhóm, giá ưu đãi/lead time | T09 |
| W-18 | `/dat-phong` bước khách | Guest data, terms/marketing riêng; bỏ điểm/coupon/Zalo login | T07 |
| W-19 | `/dat-phong/[code]/thanh-toan` | VietQR, countdown DB, pending/expired/underpaid/review | T06,T07 |
| W-20 | `/dat-phong/[code]/xac-nhan` | Receipt đã xác minh, contact/handbook, delivery trạng thái thật | T07 |
| W-21 | `/dat-phong/[code]` | Xem booking bằng guest session hoặc owner; yêu cầu hủy/đổi theo quyền | T07,T10 |
| W-22 | `/dich-vu/da-lat` | Menu công khai; thêm phí cần token kỳ ở, request tracking | T09 |
| W-23 | `/handbook/da-lat` và phần cá nhân scoped | Nội quy/đường đi public; thông tin khách/Wifi riêng qua phiên; reminder 24h | T07,T09 |
| W-28 | `/shop` | 9 danh mục, collection/energy filters; không số Give mẫu | T13 |
| W-29 | `/shop/danh-muc/[slug]` | Filter/sort/empty, query URL có kiểm soát | T13 |
| W-30 | `/shop/[slug]` | Biến thể, tồn, Energy Card, video/disclaimer, notify stock | T13 |
| W-31 | `/gio-hang` | Local/account cart, quantity/reprice | T15 |
| W-32 | `/thanh-toan` | Địa chỉ, COD/bank, ship, terms, submit chống lặp | T15 |
| W-33 | `/don-hang/[code]` | Tracking riêng tư, ritual 24h, payment/fulfillment độc lập | T15 |
| W-35 | `/la/[slug]` | QR hướng dẫn nghi lễ public; không lưu nhật ký cảm xúc | T13,T15 |
| W-37 một phần | `/dang-nhap`, `/quen-mat-khau`, `/dat-lai-mat-khau`, `/auth/callback`, `/auth/mfa` | Email/Google, invite, recovery, verified claim; authPhase=email | T03 |
| W-94 | `/ops/ca` | Chọn role/điểm, mở ca, tiền đầu; không thu nhật ký cảm xúc | T10 |
| W-95 | `/ops/phong` | Sơ đồ ngày/timeline tuần, realtime, conflict/error/stale | T10 |
| W-96 | `/ops/dat-phong/moi` | Booking thủ công, source, tiền thực nhận | T10 |
| W-97 | `/ops/dat-phong/[id]` | Khách/quyền, item/payment/event timeline | T10 |
| W-98 | `/ops/dat-phong/[id]/nhan-phong` | LT02, giấy tờ có TTL, nghiệm thu/key/consent | T10,T11 |
| W-99 | `/ops/dat-phong/[id]/tra-phong` | LT04, charges/balance, key revoke, dirty task | T10 |
| W-100 | `/ops/tickets` | BM04/SLA/assignment/escalation/timeline | T09,T10 |
| W-101 | `/ops/dich-vu` | Requested/accepted/in progress/completed | T09 |
| W-102 | `/ops/ca/[id]/ban-giao` | BM01, cash reconciliation, hai người ký | T10 |
| W-103 | `/ops/buong-phong` | Priority/assignment/status, offline indicator | T11,T12 |
| W-104 | `/ops/buong-phong/[id]` | 7 nhóm/BM02/ảnh/note, draft/queue/conflict | T11,T12 |
| W-105 | `/ops/nghiem-thu/[id]` | BM03 pass/fail/rework, online approval | T11 |
| W-106 | `/ops/lich-don` | BP02 DND/permission và BP04 recurring | T11 |
| W-107 | `/ops/vat-tu` | BP03 sạch/bẩn/giặt/mất, minimum/replenishment | T11 |
| W-108 | `/ops/su-co`, `/ops/do-that-lac` | BM04, ảnh, bảo trì, niêm phong/return evidence | T11 |
| W-111 | `/ops/huong-dan` | Số trực, sơ đồ thoát, quy trình/SOP version, offline minimal | T11,T12 |
| W-112 | `/admin` | 5 nguồn, công suất/ADR/kênh/order, filters/alerts | T17 |
| W-113 | `/admin/khach-hang` | CRM timeline/merge/segment/campaign/export | T16 |
| W-114 | `/admin/diem/da-lat` | Điểm/phòng/rate/block/feed/service/nhân sự; chưa mở đa điểm UI | T03,T05,T08,T09 |
| W-115 | `/admin/san-pham`, `/admin/kho` | Product/variant/energy/inventory; ẩn lot/vendor/KiotViet | T13 |
| W-116 | `/admin/don-hang` | Stay/shop/service; cập nhật hợp lệ, shipping thủ công | T15,T17 |
| W-117 một phần | `/admin/thanh-toan` | Xác nhận bank/cash, mismatched/late, refund evidence; chưa đối soát nhiều cổng | T06 |
| W-118 một phần | `/admin/so-cai` | Read/filter/export operational ledger | T17 |
| W-128 một phần | `/admin/noi-dung` | Markdown/pages/media/revisions/calendar; chưa landing builder | T14 |
| W-129 một phần | `/admin/thong-bao` | Mẫu giao dịch/campaign, outbox/delivery/retry; chưa drip LMS | T07,T16 |
| W-131 | `/admin/nhan-su` | Invite, role scope, disable, MFA | T03 |
| W-132 một phần | `/admin/cau-hinh`, `/admin/audit` | Chính sách/settings, audit; chưa BigQuery | T03,T17 |
| W-133 | `/ops/trang-thai`, `/admin/trang-thai` | Incident/status/job health/runbook; không hiển thị secret | T19 |

## 3. Hoãn có chủ đích theo PRD

| Prototype | Giai đoạn | GĐ0 xử lý |
|---|---|---|
| W-05 podcast; W-06-W-07 landing/lead magnet | GĐ1 | Không xây player/landing builder; form contact/newsletter cơ bản vẫn có |
| W-24 review + cảm xúc + quay lại | GĐ1 | Mời Google review/cảm ơn LT04; không cấp điểm/coupon hay thu mood |
| W-25 B2B portal; W-26 cafe QR POS; W-27 cây tâm nguyện | GĐ3/GĐ2/GĐ1 | Nhận lead liên hệ; booking nguồn B2B do lễ tân nhập; đồ uống vẫn là service item |
| W-34 lot tracking, W-36 vendor | GĐ3 | Energy Card và QR nghi lễ GĐ0 không kéo theo truy xuất lô/vendor |
| W-38-W-40 consent quiz/quiz/result | GĐ1 | Không thu answers/energy profile |
| W-41-W-50 member dashboard/wallet/subscription/referral | GĐ1-GĐ3 | Auth/receipt/cart tối thiểu ở W-37,W-21,W-33; không dựng member suite |
| W-51-W-61 Learn/Challenge | GĐ1-GĐ3 | Không player/enrollment/certificate/live |
| W-62-W-68 Experts/Studio | GĐ1-GĐ3 | Không application/consult/payout |
| W-69-W-74 Events/Retreat | GĐ1-GĐ3 | Không ticket/retreat; hoạt động tại điểm nhận service/manual order |
| W-75-W-82 Community | GĐ1-GĐ2 | Không UGC/groups/mood journals |
| W-83-W-93 Give | GĐ2-GĐ3 | CMS giới thiệu sứ mệnh, không nhận quyên góp |
| W-109 nhật ký ca, W-110 tư vấn 3 tầng | GĐ1/GĐ2 | Không thu dữ liệu năng lượng nhạy cảm sớm |
| W-119-W-127 | GĐ1-GĐ3 | Payout/coupon/subscription/tier/course/expert/event/moderation/Give admin ẩn |
| W-130 energy quiz admin | GĐ1-GĐ2 | Không dùng để quản lý Energy Card GĐ0; card nằm trong editor phòng/product |
| A-01-A-42 toàn bộ mobile native | GĐ4 | Chỉ tham khảo tương tác Ops, GĐ0 triển khai PWA |

F1 thực hiện đến lưu trú/checkout, bỏ review có thưởng. F2 thực hiện mua/tracking/QR cho guest và account cơ bản. F7/F8 thực hiện trên Ops PWA. F10 chỉ dashboard/thanh toán/sổ cái tối thiểu, bỏ payout. F3-F6/F9 hoãn đúng giai đoạn.

## 4. State contract chung cho QA

Mọi route có loading/skeleton, empty có hành động, lỗi retry, validation field-level, forbidden/not-found đúng quyền. Booking bổ sung room sold out sau chọn, quote changed, hold expired, QR pending, partial/over/late paid, mất mạng/reconnect. Shop bổ sung variant OOS, stock changed tại checkout, COD pending và ritual gate. Ops bổ sung offline, queued/syncing/synced/conflict/revoked/quota-full; disable action online-only kèm lý do.

Visual regression trên Chromium mobile/desktop, smoke WebKit/Firefox; chụp light/dark 390/834/1440 cho template tiêu biểu, so với prototype đã loại demo. UAT dùng phòng/giá thật đã duyệt để kiểm bố cục không tràn số tiền, form bàn phím, lịch tháng không hard-code 2026.
