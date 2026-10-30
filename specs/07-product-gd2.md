# Đặc tả sản phẩm GĐ2: Kiểm chứng và thanh toán

Ngày: 29/10/2026. Nguồn chuẩn: PRD mục 3.3 (SHOP-03), 3.4 (LRN-04), 3.5 (EXP-03), 3.6 (EVT-02), 3.8 (MEM-01, MEM-03), 3.9 (GIV-01..04), 3.10 (ADM-03, ADM-05), 3.11 (NRG-04), 6.2, 7, 8 (GĐ2 S9-S14); prototype W-46/47/48, W-64/65/66, W-71, W-83..W-93, W-117..W-122; tài liệu `KẾ HOẠCH CHÍNH_ NỀN TẢNG THIỆN NGUYỆN VÀ MÔI TRƯỜNG`, `KẾ HOẠCH CHÍNH MÔ HÌNH PHI LỢI NHUẬN`, `MẪU KẾ HOẠCH QUẢN LÝ TÀI CHÍNH`, `prepare/design/CLAUDE.md` (giá Premium, tỷ lệ chia). Kế thừa `01`, `02`, `04`, `05`, `06` và rulings; chỉ ghi phần thêm hoặc khác.

## 1. Mục tiêu và ranh giới

GĐ2 (05/04-25/06/2027) đưa tiền thật vào nền tảng: cổng thanh toán online cho mọi loại đơn, khóa trả phí, vé trả phí, tư vấn 1:1, thuê bao Premium, quyên góp; đối soát và hoàn tiền trong admin; Give v1; báo cáo chuyển đổi và cảm xúc ẩn danh. Lõi không đổi: mọi giao dịch là `commerce.orders` + `payments` + `ledger_events`; cổng chỉ là cách tiền tới.

Không làm trong GĐ2: Expert Studio soạn khóa/payout thật (GĐ3; GĐ2 chỉ tích lũy nghĩa vụ `payout_due`), affiliate, retreat/B2B, ví điểm đổi/hạng (GĐ3; GĐ2 vẫn chỉ `earn`), tem năng lượng, đa điểm, BigQuery, cafe gọi món QR (STAY-05 COULD), gian hàng tâm thức/học bổng (GIV-05/06 GĐ3), AI. Zalo OA login vẫn chờ OA.

Mốc PRD: S9-S10 05-30/04, S11 04-15/05, S12 18-29/05, S13-S14 01-25/06. PRD giả định có dev thứ hai từ 04/2027; nếu không, cắt theo thứ tự ở plan.

## 2. Vai trò mới và mở rộng

| Vai trò | Hiện thực | Năng lực |
|---|---|---|
| member_premium | Không phải role. `core.entitlements(user_id, code='premium', valid_until)` cập nhật từ subscription; RLS/RPC kiểm `core.has_entitlement('premium')` | Bài/khóa Premium, nhóm VIP, giảm 10% lưu trú và retreat, 1 healing circle miễn phí mỗi kỳ theo cấu hình |
| expert (mở rộng) | Quyền own | Khai lịch rảnh, dịch vụ/giá, xem buổi của mình, ghi chú mã hóa, xem hồ sơ năng lượng khách khi được chia sẻ, xem sổ nghĩa vụ của mình (read) |
| charity_org | Role mới trong check constraint, entity = entity Give (nonprofit), scope qua `give.org_members` | Hồ sơ tổ chức, chiến dịch, cập nhật, chứng từ, ca tình nguyện, xác nhận giờ công của chiến dịch mình |
| volunteer | Không phải role; member đã đăng ký ca | Check-in QR, nhật ký phụng sự, điểm/huy hiệu phụng sự |
| ops_finance (mở rộng) | Action mới | `payment.reconcile`, `gateway.refund` (aal2), `coupon.manage`, `subscription.manage`, `give.verify` (aal2), `give.approve_expense`, `commission.manage` (aal2) |
| editor | | `give.content` (duyệt bài cập nhật chiến dịch, gợi ý bản đồ) |

Tiền vào pháp nhân nào: đơn Space/Connect vào entity Operating như GĐ0; quyên góp vào entity nonprofit (`ZS-GIVE`, seed mới). Mỗi cổng thanh toán cấu hình theo entity (merchant riêng); nếu nonprofit chưa có pháp nhân/merchant thì Give chỉ nhận chuyển khoản VietQR về tài khoản được tài chính duyệt, không bật cổng. Đây là điều kiện mở bán, không phải code.

## 3. Ma trận phạm vi bắt buộc GĐ2

| PRD story | Mức | Phạm vi thực hiện và acceptance chính | Task |
|---|---|---|---|
| Thanh toán online (PRD 7, S9-S10) | MUST | VNPay, MoMo, ZaloPay, Stripe qua một lớp payment intent; Edge webhook/IPN xác minh chữ ký, idempotent theo mã giao dịch cổng; chỉ IPN/webhook làm đơn `paid`, trang return chỉ hiển thị; hết hạn intent; sổ cái ghi `gateway_clearing` và phí cổng; hoàn tiền qua API cổng khi hỗ trợ, có approval hai bước; 6 luồng tiền e2e sandbox | T29 |
| US-ADM-03 | MUST | Đối soát: nhập sao kê/settlement từng cổng (CSV hoặc API), khớp theo mã giao dịch và số tiền, lệch tạo việc; hoa hồng theo quy tắc entity/đối tác (`commission_rules`) tích lũy `payout_due`; kỳ payout tạo được nhưng chi trả thật GĐ3; xuất CSV cho kế toán | T29, T35 |
| US-LRN-04 | MUST | Khóa có giá, giảm giá theo thời gian, mã, bundle; mua tạo đơn `course`; ghi danh tự động khi paid; hoàn trong 7 ngày nếu tiến độ < 20% (chính sách snapshot) | T30 |
| US-MEM-03 | MUST | Mã giảm giá phần trăm/cố định/theo danh mục/giới hạn lượt/thời gian; referral: mỗi member một mã, người được mời giảm theo cấu hình (fixture 30% đơn đầu theo PRD), người mời nhận điểm khi đơn hoàn tất; chống gian lận: không tự giới thiệu, trùng SĐT/email đã xác minh, cùng IP trong 24 giờ đưa vào review | T30 |
| US-EVT-02 | MUST | Vé nhiều hạng, mã giảm, thanh toán; vé là `order_items`; hoàn theo chính sách snapshot; danh sách chờ chỉ cho sự kiện miễn phí hoặc khi hạng còn chỗ sau hủy | T30 |
| Bỏ giỏ tự động (S9-S10) | MUST | Giỏ của member không đổi 24 giờ và chưa đặt -> chuỗi `cart.abandoned` (cần consent marketing), dừng khi đã đặt | T30 |
| US-EXP-03 | MUST | Lịch rảnh tuần lặp + ngoại lệ, 30/60/90 phút, giá 300.000-2.000.000 đ/giờ cấu hình theo dịch vụ, buffer; khách chọn slot theo múi giờ, giữ slot 15 phút chờ thanh toán, đơn `consult`; Google Meet tự tạo, fallback link tay; nhắc 24h/1h; hủy/đổi theo chính sách; no-show; đánh giá; ghi chú chuyên gia mã hóa; chia sẻ hồ sơ năng lượng có đồng ý theo từng buổi | T31 |
| US-MEM-01 | MUST | Premium 199.000 đ/tháng, 1.990.000 đ/năm: Stripe Checkout subscription + Customer Portal cho thẻ; ví VN: đơn `subscription` theo kỳ, nhắc gia hạn 7 ngày và 1 ngày trước, ân hạn 7 ngày; trạng thái trial/active/past_due/cancelled; quyền lợi cấu hình; nhóm VIP; trang quản lý | T32 |
| US-SHOP-03 | SHOULD, làm theo DoD S12 | KiotViet: mapping SKU, kéo tồn showroom mỗi 10 phút, đẩy đơn web sang KiotViet để trừ kho chung; báo cáo lệch; tắt khi không có API key | T32 |
| Vận chuyển API (PRD 7) | SHOULD, làm | Adapter một đơn vị (GHN mặc định): báo phí theo địa chỉ, tạo vận đơn, webhook trạng thái; fallback bảng phí cố định GĐ0 | T32 |
| US-GIV-01 | MUST | Bản đồ ba mảng con người/môi trường/giáo dục, lọc tỉnh, Google Maps, nhập từ file tổng hợp, đề xuất bổ sung có duyệt | T33 |
| US-GIV-02 | MUST | Tổ chức đăng ký và xác minh giấy tờ; chiến dịch mục tiêu tiền/hiện vật/giờ công, tiến độ, cập nhật, ảnh; quyên góp tiền tạo đơn `donation` (cổng hoặc VietQR), ẩn danh, lời nhắn, biên nhận; quyên góp hiện vật đăng ký và xác nhận nhận | T33 |
| US-GIV-03 | MUST | Ca tình nguyện, đăng ký, cam kết, QR check-in, giờ công xác nhận bởi trưởng nhóm, nhật ký có ảnh, điểm và huy hiệu phụng sự vào ví điểm chung | T34 |
| US-GIV-04 | MUST | Trang minh bạch chiến dịch: tổng thu, tổng chi, chứng từ đã duyệt, ảnh xác minh, người xác nhận; khoản chi > 5.000.000 đ cần 2 người duyệt; "lợi nhuận trao đi" trích tự động từ sổ cái khi đơn sản phẩm hoàn tất | T34 |
| US-ADM-05 | SHOULD, làm | Báo cáo ẩn danh cảm xúc trước/sau lưu trú và sự kiện theo điểm/tháng (mở rộng `energy.report` GĐ1) | T35 |
| Dashboard phễu (S13-S14, ADM-01 GĐ2+) | MUST | GMV, hoa hồng, thuê bao, phễu truy cập -> đăng ký -> hồ sơ -> ghi danh -> trả tiền theo nguồn/UTM | T35 |
| US-NRG-04 | SHOULD | Hoãn: showroom chưa có nhân sự bán; spec giữ chỗ bằng quiz rút gọn dùng lại `energy.quiz_definitions` khi mở | - |
| US-COM-03 | COULD | Healing circle định kỳ = sự kiện `healing_circle` lặp theo lịch; quyền lợi Premium áp dụng qua entitlement; không xây phòng gặp riêng | T32 |

## 4. Thanh toán online

- Một đơn có thể có nhiều `payment_intents` nhưng chỉ một `created|redirected` tại một thời điểm; intent có `amount` khóa từ `orders.total - paid_amount` lúc tạo, hết hạn theo cổng (VNPay/MoMo/ZaloPay 15 phút, Stripe 30 phút) và theo hold của đơn (giữ phòng 30 phút, slot tư vấn 15 phút, vé 15 phút, hàng 30 phút).
- Server tạo URL/QR/Checkout Session và ký; client chỉ redirect. Return URL không được tin: trang `/thanh-toan/ket-qua?order=` chỉ đọc trạng thái từ DB và poll 3 giây tối đa 2 phút, sau đó hướng dẫn "tiền sẽ được ghi nhận khi cổng báo về, bạn sẽ nhận email".
- IPN/webhook: Edge `payments` kiểm chữ ký theo cổng, so `amount` với intent, so `order` với intent, rồi gọi `commerce.record_payment_atomic(provider=<gateway>, provider_ref=<mã giao dịch cổng>)`. Cùng mã giao dịch replay trả cùng kết quả (unique đã có). Cổng báo thất bại -> intent `failed`, đơn giữ nguyên và cho tạo intent mới. Cổng báo thành công sau khi hold hết hạn -> cơ chế `try_reallocate`/`needs_review` của GĐ0 áp dụng cho mọi loại đơn (slot tư vấn, vé, hàng).
- Phí cổng: ghi `gateway_fee` khi settlement nhập về (không ước lượng lúc thanh toán); `gateway_clearing` là tài khoản trung gian, khớp về `bank` khi đối soát.
- Hoàn tiền: `refund_requests` GĐ0 mở rộng `method gateway|bank|cash`; `approve_refund` với method `gateway` gọi Edge `payments/refund` (VNPay, MoMo, ZaloPay, Stripe đều có API hoàn), kết quả bất đồng bộ qua IPN hoàn -> `refund.settled`; thất bại giữ `approved_pending` để tài chính chuyển khoản tay. Chính sách hoàn theo loại đơn snapshot vào `orders.policy_snapshot` (khóa 7 ngày <20%, tư vấn theo mốc 24 giờ, vé theo sự kiện, phòng theo GĐ0).
- Bật/tắt từng cổng theo entity trong `runtime_settings payments.gateways` với `mode sandbox|live`; production chỉ `live` sau khi 6 luồng e2e sandbox xanh và có giao dịch thử 10.000 đ hoàn lại. Credentials chỉ ở Edge secrets. VietQR thủ công GĐ0 vẫn là phương án dự phòng luôn hiện.

## 5. Khóa trả phí, mã giảm, referral, vé, bỏ giỏ

- `courses.price > 0` được publish; `course_prices(course_id, price, compare_price, starts_at, ends_at)` cho giảm theo thời gian; `course_bundles(slug, course_ids[], price)`. Đơn `course` có items theo khóa (bundle tách dòng, giảm phân bổ theo tỷ lệ). Ghi danh `source=paid` tạo trong cùng transaction khi đơn `paid`. Premium: khóa `is_premium` miễn phí cho entitlement, ghi danh `source=premium`, mất entitlement không thu hồi khóa đã ghi danh (ruling, đơn giản và tử tế).
- Hoàn khóa: trong 7 ngày từ paid và `progress_pct < 20` -> member tự yêu cầu, tài chính duyệt; ghi danh chuyển `revoked`, chứng nhận không cấp. Ngoài điều kiện -> từ chối với lý do.
- Mã giảm `commerce.coupons(code, kind percent|fixed, value, scope all|course|event|product|consult|subscription, max_uses, per_user, starts_at, ends_at, min_total, entity_id)`; áp dụng trong RPC tạo đơn, lưu `coupon_id` và `discount` trên đơn, đếm lượt khi đơn paid (không khi tạo), trả lượt khi đơn hủy/hết hạn. Một đơn một mã; referral và coupon không cộng dồn (lấy mức lợi hơn cho khách).
- Referral: `profiles.referral_code` (6-8 ký tự), link `/m/[code]` đặt cookie 30 ngày; `commerce.referrals(referrer_id, referee_id unique, code, first_order_id, state pending|converted|rejected, risk_flags)`. Giảm cho người được mời áp dụng đơn đầu tiên có tiền; người mời nhận điểm (`point_transactions source referral`) khi đơn `completed` (không khi paid, để tránh hoàn). Chặn: referee = referrer, referee đã có đơn trước đó, SĐT đã xác minh trùng người mời, cùng IP trong 24 giờ -> `risk_flags` và tài chính duyệt thủ công. Mức giảm và điểm là fixture (`30%`, `200 điểm`) chờ duyệt.
- Vé trả phí: `events.ticket_tiers(event_id, name, price, qty, sales_end)`; đơn `event` với item mỗi vé; vé `registrations` tạo khi paid; hoàn theo chính sách sự kiện; sức chứa = tổng tier.
- Bỏ giỏ: cron giờ tìm `shop.carts` của member cập nhật > 24 giờ chưa có đơn -> `start_sequence('cart.abandoned')` một lần mỗi 7 ngày; `stop_if` có đơn hoặc giỏ rỗng; cần consent marketing.

## 6. Tư vấn 1:1

- `expert.availability_rules(expert_id, dow, start_min, end_min, tz)`, `availability_exceptions(date, start, end, available)`, `expert.services` thêm `duration_min in (30,60,90)`, `buffer_min`, `price`, `format`. Slot sinh server theo tuần: rule trừ exception, trừ buổi đã đặt + buffer, trừ quá khứ và trước `min_lead_hours` (mặc định 12).
- `expert.consult_bookings(order_id, expert_id, service_id, customer_user_id, slot tstzrange, state held|confirmed|rescheduled|cancelled|completed|no_show, meet_url, meet_provider google|manual, share_energy_profile, customer_note, policy_snapshot, held_until, version)` với `exclude using gist (expert_id with =, slot with &&) where (state in ('held','confirmed'))` và cùng pattern khóa như `room_allocations`. Hold 15 phút chờ thanh toán; trả trước toàn bộ.
- Khi paid: tạo Meet qua Edge `meet` (Google Calendar API service account, calendar riêng của ZSOPO, mời email khách và chuyên gia) ; lỗi API -> `meet_provider manual`, việc cho ops dán link trong 2 giờ; link chỉ hiện với hai bên. Nhắc 24h/1h kind `consult.reminder`.
- Hủy/đổi: khách tự đổi miễn phí trước 24 giờ (một lần), hủy trước 24 giờ hoàn 100%, dưới 24 giờ hoàn 50% (fixture prototype, snapshot vào đơn); chuyên gia hủy -> hoàn 100% + xin lỗi + ưu tiên slot; no-show do chuyên gia đánh dấu sau giờ kết thúc, khách có 48 giờ phản đối.
- Sau buổi: khách đánh giá 1-5 + nhận xét (công khai sau khi editor duyệt, ẩn danh tùy chọn) và "báo cáo riêng"; chuyên gia ghi `notes_enc` (pgp_sym với khóa Vault `consult_notes_key`, chỉ chuyên gia đó giải mã) và `next_step` gửi khách qua thông báo.
- Chia sẻ hồ sơ năng lượng: cờ theo từng buổi, mặc định lấy `energy.profiles.share_with_experts`, khách đổi được tới trước giờ bắt đầu; chuyên gia đọc `expert.shared_profile(booking)` trả persona + 7 chỉ số, không câu trả lời, không nhật ký, chỉ trong cửa sổ [bắt đầu - 7 ngày, kết thúc + 1 ngày], mỗi lần đọc ghi `energy.access_logs`. Khách thấy log truy cập trong `/toi/cai-dat`.
- Doanh thu: `revenue_consult` ghi khi `completed`; `payout_due` cho chuyên gia theo `commission_rules` (fixture 80% chuyên gia); no-show của khách vẫn ghi nhận.

## 7. Membership

- `commerce.subscriptions(user_id, plan monthly|yearly, provider stripe|manual, provider_ref, status trialing|active|past_due|cancelled|expired, current_period_start, current_period_end, cancel_at, grace_until)`. Một user một subscription active.
- Stripe: Checkout Session mode subscription, webhook `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated|deleted`; mỗi `invoice.paid` tạo đơn `subscription` + payment provider `stripe` (idempotent theo invoice id); Customer Portal để đổi thẻ/hủy. Giá niêm yết VND; Stripe tính VND (zero-decimal), kiểm lúc implement.
- Ví VN: `renew_manual` tạo đơn `subscription` cho kỳ kế tiếp, thanh toán qua cổng VN; nhắc 7 ngày và 1 ngày trước hết kỳ; quá hạn vào `past_due` với `grace_until = period_end + 7 ngày`, hết ân hạn -> `expired`, entitlement tắt. Không tự động trừ ví VN cho tới khi cổng hỗ trợ token (ghi deviation).
- Entitlement: trigger cập nhật `core.entitlements` từ subscription; quyền lợi cấu hình `runtime_settings membership.benefits`: `premium_courses`, `vip_group`, `stay_discount_bp=1000`, `healing_circle_per_period=1`. Giảm lưu trú áp trong `quote_stay` khi có `auth.uid()` có entitlement (dòng discount riêng, snapshot). Nhóm VIP: `community.groups kind vip`, membership tự theo entitlement, mất entitlement -> `state suspended` (đọc được, không đăng).
- Hủy: giữ quyền lợi tới hết kỳ; hoàn tiền thuê bao chỉ theo yêu cầu đặc biệt qua `refund_requests`.

## 8. KiotViet và vận chuyển

- KiotViet: `shop.kiotviet_links(variant_id unique, kiotviet_product_code, branch_id)`; Edge `kiotviet-sync` cron 10 phút: kéo tồn các mã đã map -> ghi `inventory.on_hand` kho showroom (web `reserved` giữ nguyên), lưu `job_runs` và `shop.sync_diffs` khi `|on_hand_cũ - mới| > ngưỡng`; đẩy đơn web `confirmed` sang KiotViet invoice/order để trừ kho chung (idempotent theo mã đơn ZS). Lỗi API không ghi đè tồn (giữ last-good), cảnh báo sau 2 lần. Không có API key -> hoàn toàn nội bộ như GĐ0.
- Vận chuyển: Edge `shipping` adapter GHN (cấu hình `shipping.provider`): `quote(address, weight)` dùng ở checkout thay bảng cố định khi bật, `create(order)` khi `ready_to_ship`, webhook trạng thái -> `shipments.state` và fulfillment `shipped/completed/returned`; địa chỉ chuẩn hóa theo danh mục tỉnh/quận/phường do GHN cung cấp (thay bảng `shop.regions` tự nhập). Lỗi báo phí -> fallback bảng cố định và gắn cờ cho vận hành.

## 9. Give v1

- Entity `ZS-GIVE` kind nonprofit. `give.orgs(slug, name, fields[] people|environment|education, province_code, geo point, description_md, contact, verified_at, verified_by, license_no, status pending|verified|rejected|suspended)`, `give.org_documents` (private), `give.org_members(org_id, user_id, role owner|member)` cấp role `charity_org`. Nhập dữ liệu bản đồ từ CSV tổng hợp (admin import, `status=listed` không xác minh) và đề xuất cộng đồng (`give.org_suggestions`) có duyệt.
- Chiến dịch `give.campaigns(org_id?, slug, title, areas[], goal_money, goal_items jsonb, goal_hours, raised_money (tính từ sổ cái), starts_at, ends_at, status draft|review|published|closed, cover, story_md, co_hosts)`; `give.campaign_updates` (editor/org đăng, duyệt). Chiến dịch do ZSOPO Give tự tổ chức có `org_id null`.
- Quyên góp tiền: đơn `donation` (entity nonprofit, không VAT, không ship), mức gợi ý + nhập tay (tối thiểu 10.000 đ), ẩn danh (tên không hiện public nhưng vẫn lưu cho biên nhận), lời nhắn (duyệt trước khi hiện). Thanh toán cổng (nếu merchant nonprofit có) hoặc VietQR thủ công; `paid` -> ledger `bank/gateway_clearing` nợ, `donation_fund` có, kèm `campaign_id` trong `ledger_events.meta`. Biên nhận PDF (reuse pipeline chứng nhận) với mã `ZS-`; email khi khoản chi được công khai.
- Hiện vật: `give.item_pledges(campaign_id, user_id, item, qty, state pledged|received|declined, received_by)`; tiến độ hiện vật đếm `received`.
- Tình nguyện: `give.shifts(campaign_id, title, starts_at, ends_at, location_text, capacity, leader_user_id)`, `give.shift_registrations` (cam kết, QR như vé sự kiện, check-in bởi leader/org/staff), `give.service_logs(registration_id, hours, note, photos[], verified_by, verified_at)`; giờ chỉ tính khi leader xác nhận; điểm phụng sự `point_transactions source volunteer` theo `points.rules.volunteer_hour` (fixture 10/giờ) và huy hiệu (10/50/100 giờ).
- Minh bạch: `give.expenses(campaign_id, title, amount, spent_at, receipt_media[], state draft|submitted|approved|published|rejected, approved_by[], note)`; > 5.000.000 đ cần hai người duyệt khác nhau (`give.approve_expense`); publish ghi ledger `donation_fund` nợ, `bank` có với `campaign_id`; chứng từ công khai là bản đã duyệt (ảnh che thông tin cá nhân do tổ chức tự che, editor kiểm). Trang minh bạch: tổng thu (sổ cái), tổng chi (đã publish), số dư, bảng chi, cập nhật trong 72 giờ sau khi chi (hiển thị cảnh báo khi quá hạn), tuyên bố kiểm toán chỉ hiện khi có file báo cáo thật.
- Lợi nhuận trao đi: `products.profit_share_bp` + `give_fund_id`; khi item sản phẩm recognized (`completed`), ghi thêm event `profit_share`: `revenue_product` nợ phần trích (giảm doanh thu giữ lại) và `donation_fund` có cho campaign/quỹ mặc định; phần trích tính trên giá bán sau giảm nhân `profit_share_bp` (vì chưa có giá vốn; ghi rõ là "trích doanh thu", chưa gọi "lợi nhuận" cho tới khi tài chính cấp công thức). Hiển thị trên trang sản phẩm và trang chiến dịch.
- Chuyển tiền thực từ Operating sang nonprofit theo kỳ là việc tài chính (xuất báo cáo `profit_share_due`), không tự động.

## 10. Báo cáo, đối soát và điều kiện hoàn thành

- Đối soát (W-117): nhập settlement theo cổng (CSV VNPay/MoMo/ZaloPay, Stripe Balance Transactions API), khớp `provider_ref` + số tiền, trạng thái `matched|amount_mismatch|missing_in_db|missing_in_gateway`; mỗi lệch là việc có owner; phí cổng ghi từ settlement; đóng kỳ đối soát khi 0 lệch mở hoặc có lý do. Hoa hồng/payout (W-119): `commerce.commission_rules(scope platform|expert|vendor|affiliate|franchise, target_id, item_type, rate_bp, effective_from)`, `payout_due` tích lũy theo counterparty; kỳ payout tạo nháp để GĐ3 chi trả.
- Phễu (W-112 GĐ2): `visit -> signup -> energy_profile -> enrolled_free -> first_paid -> premium` theo tuần và theo `source/utm` từ PostHog (server events GĐ1) đối chiếu DB; GMV theo loại đơn, hoa hồng tích lũy, thuê bao active/past_due/churn, quyên góp theo chiến dịch.
- Báo cáo cảm xúc (ADM-05): `energy.report` thêm cặp check-in `context stay` trước nhận phòng/sau trả phòng và `context event` trước/sau; n ≥ 20, chỉ người consent `research`.
- Điều kiện hoàn thành: 6 luồng tiền (phòng, mua hàng, ghi danh trả phí, tư vấn, thuê bao, quyên góp) e2e xanh trên sandbox từng cổng; webhook replay/sai chữ ký/sai số tiền/trễ sau hết hold đều pass; đối soát khớp 100% trên bộ settlement fixture; slot tư vấn không trùng dưới tranh chấp; entitlement bật/tắt đúng theo kỳ; chi > 5 triệu không publish với một người duyệt; `profit_share` cân sổ. Gate thực địa: giao dịch thật đầu tiên mỗi cổng, 20 buổi tư vấn thật trong 2 tuần, 10 thuê bao thử, tồn kho web khớp showroom, 1 chiến dịch "Ngày Chữa Lành" chạy thật. Pháp lý/tài chính: hợp đồng merchant từng cổng theo entity, pháp nhân nonprofit và tài khoản nhận quyên góp, chính sách hoàn theo loại đơn, tỷ lệ chia chuyên gia ký, công thức "lợi nhuận trao đi", OWASP ASVS L2 cho thanh toán và dữ liệu nhạy cảm (PRD 4).
