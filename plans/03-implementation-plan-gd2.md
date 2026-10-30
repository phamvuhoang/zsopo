# ZSOPO GĐ2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ dùng subagent-driven-development nếu người dùng cho phép cách thực hiện đó. Ghi ruling mới vào `docs/implementation-rulings.md`.

**Goal:** Đưa tiền thật vào nền tảng qua bốn cổng thanh toán với đối soát và hoàn tiền; mở khóa trả phí, vé, tư vấn 1:1, Premium, Give v1; đo được chuyển đổi.

**Architecture:** Lớp `payment_intents` + Edge `payments` với adapter từng cổng; IPN/webhook là nguồn sự thật duy nhất, đổ vào `record_payment_atomic` GĐ0; mọi loại đơn mới dùng cùng hold/expire/reallocate pattern; Give là schema `give` dưới entity nonprofit với sổ cái riêng; secret chỉ ở Edge.

**Tech Stack:** như GĐ1, thêm `stripe` (npm, dùng trong Deno qua `npm:`), parser CSV nhỏ tự viết (không thêm thư viện), Google Calendar REST qua fetch với JWT service account (không thêm googleapis).

**Spec:** `../specs/07-product-gd2.md`, `../specs/08-architecture-gd2.md`; nền: `01`, `02`, `04`, `05`, `06`, `../docs/implementation-rulings.md`.

## Global Constraints

- Giữ Global Constraints GĐ0/GĐ1. Secret cổng, Google, KiotViet, GHN chỉ trong Edge secrets, theo môi trường và theo entity.
- Chỉ IPN/webhook đã xác minh chữ ký mới ghi tiền; return URL, client, admin UI không ghi `paid` từ cổng (admin vẫn ghi tiền thủ công có chứng cứ như GĐ0).
- Số tiền luôn lấy từ `payment_intents.amount` server; so khớp tuyệt đối với cổng báo về.
- Production mỗi cổng chỉ `live` sau khi e2e sandbox xanh và giao dịch thử có hoàn; `runtime_settings payments.gateways` mặc định tắt.
- Đơn 0 đồng không tạo intent; mọi đơn mới kế thừa `policy_snapshot`, `idempotency`, `try_reallocate`/`needs_review`.
- Give: tiền quyên góp và chi tiêu ở entity nonprofit; không bật cổng cho Give khi chưa có merchant của pháp nhân nonprofit.
- Không thêm thư viện UI/chart/player; CSV, PDF, QR, SVG dùng những gì GĐ1 đã có.

## Review Focus

1. IPN tới hai lần với cùng mã giao dịch nhưng lần hai khác số tiền: lần hai phải bị từ chối (`VERSION_CONFLICT` nội bộ), ghi `gateway_events outcome=amount_mismatch`, không đổi đơn. Test T29.
2. Khách thanh toán xong ở cổng nhưng đóng trình duyệt trước return: đơn vẫn `paid` nhờ IPN, email biên nhận gửi, trang `/toi` thấy đơn. Test T29 (không gọi return).
3. Hai khách giữ cùng slot tư vấn cách nhau 1 giây, người đầu chưa trả tiền: người hai nhận `SLOT_TAKEN`; sau 15 phút người đầu hết hạn, slot mở lại; nếu tiền người đầu về sau 16 phút và slot còn trống thì `try_reallocate` xác nhận, nếu người hai đã giữ thì `needs_review` và hoàn. Test T31.
4. Thuê bao Stripe `invoice.payment_failed` rồi `invoice.paid` muộn trong ân hạn: entitlement không bị tắt trong ân hạn, không tạo hai đơn cho cùng invoice. Test T32.
5. Khoản chi 6.000.000 đ được cùng một người bấm duyệt hai lần: vẫn thiếu người thứ hai, không publish, không ghi sổ. Test T34.

## 1. Sprint, phụ thuộc và năng lực

| Sprint PRD | Task | Deliverable | Gate thực địa |
|---|---|---|---|
| S9 05-16/04 | T29 | Payment intents, 4 adapter cổng, IPN/webhook, hoàn qua cổng, đối soát, màn thanh toán chung | Hợp đồng merchant và sandbox từng cổng |
| S10 19-30/04 | T30 | Khóa trả phí/bundle/giảm giá, mã giảm, referral, vé trả phí, bỏ giỏ | Giao dịch thật đầu tiên; 6 luồng e2e sandbox |
| S11 04-15/05 | T31 | Tư vấn 1:1, Meet, nhắc, hủy/đổi, đánh giá, ghi chú mã hóa, chia sẻ hồ sơ | 20 buổi thật trong 2 tuần |
| S12 18-29/05 | T32 | Premium Stripe + ví VN, entitlement, VIP, KiotViet, GHN | 10 thuê bao thử; tồn khớp showroom |
| S13 01-11/06 | T33 | Give: tổ chức, xác minh, bản đồ, chiến dịch, quyên góp, hiện vật | Pháp nhân nonprofit + tài khoản nhận |
| S14 14-25/06 | T34, T35 | Tình nguyện, giờ công, minh bạch, lợi nhuận trao đi; báo cáo phễu/cảm xúc, UAT, release | 1 chiến dịch "Ngày Chữa Lành" thật |

Critical path: T29 -> T30 -> T31 -> T32 -> T33 -> T34 -> T35. T29 không thể bắt đầu sandbox thật nếu chưa có tài khoản merchant: PRD nói nộp hồ sơ ngay sau GĐ0 (2-4 tuần); nếu còn thiếu, adapter viết theo tài liệu công khai và test bằng fixture chữ ký tự ký, đánh dấu "chưa sandbox". Ước lượng 60-75 engineer-days với hai người theo PRD; một người thì cắt theo thứ tự: GHN API (giữ bảng phí), KiotViet, referral chống gian lận nâng cao, bản đồ nhập CSV (nhập tay), báo cáo cảm xúc ADM-05, ZaloPay (giữ VNPay/MoMo/Stripe).

## 2. Quy ước

Như GĐ0/GĐ1. Helper mới `tests/integration/helpers.ts`: `signVnpay(params, secret)`, `signMomo(...)`, `signZalopay(...)`, `stripeEvent(type, payload, secret)` tạo chữ ký hợp lệ cho fixture; `postIpn(provider, body)` gọi Edge local. Fixture secret sandbox giả trong `supabase/functions/.env.example` (`*_SANDBOX_*`), `seed-validate --production` từ chối. Seed: entity `ZS-GIVE`, 1 khóa trả phí, 1 bundle, 2 coupon, 1 expert có lịch rảnh, 2 tier vé, 1 tổ chức verified, 1 chiến dịch, 1 quỹ mặc định, `commission_rules` fixture (expert consult 8000bp, course 7000bp).

## T29. Payment intents, adapter cổng, IPN/webhook, hoàn tiền, đối soát

**Phụ thuộc:** GĐ1 hoàn tất. **Ước lượng:** 8-9 ngày.

**Files tạo:** `supabase/migrations/202704050001_payment_intents.sql`, `supabase/functions/payments/index.ts` (thay stub), `supabase/functions/_shared/gateways/{types,vnpay,momo,zalopay,stripe}.ts`, `supabase/functions/settlement-import/index.ts`, `packages/core/src/commerce/{gateway-amount,gateway-amount.test,settlement-match,settlement-match.test}.ts`, `packages/api/src/payments.ts` (mở rộng), `apps/web/src/app/(guest)/thanh-toan/[code]/page.tsx` (thay trang thanh toán stay/shop hiện có bằng màn chọn cổng chung), `(guest)/thanh-toan/ket-qua/page.tsx`, `apps/web/src/app/api/payments/create/route.ts`, `apps/web/src/features/payments/{gateway-picker,status-poll}.tsx`, `apps/web/src/app/admin/thanh-toan/{cong/page,doi-soat/page}.tsx`, `tests/integration/gateways.test.ts`, `tests/integration/settlement.test.ts`, `tests/e2e/pay-gateway.spec.ts`, `docs/runbooks/gateways.md`.

**Files sửa:** `202611030002_commerce.sql` constraints qua migration mới (orders.kind, payments.provider, ledger accounts), `commerce.approve_refund` (method gateway -> pg_net tới Edge refund), `commerce.record_payment_atomic` (ledger `gateway_clearing` khi provider là cổng), `apps/web/src/app/(guest)/dat-phong/[code]/thanh-toan/page.tsx` và shop `thanh-toan` (nút "Thanh toán online" dẫn sang màn chung khi cổng bật), `docs/runbooks/payments.md`, `functions/.env.example`, `helpers.ts`.

**Interfaces:**
- Produces: `toGatewayAmount(provider, vnd: bigint): string|number` (VNPay ×100, MoMo/ZaloPay nguyên, Stripe VND zero-decimal), `fromGatewayAmount`; `matchSettlement(lines, payments): MatchResult[]` (matched/amount_mismatch/missing_in_db/missing_in_gateway).
- Gateway adapter interface (`types.ts`): `createIntent(ctx, intent) -> IntentResult`, `verify(req) -> VerifiedIpn | {ok:false, reason}`, `ack(outcome) -> Response`, `refund(ctx, payment, amount, idem) -> {ref, state: 'settled'|'pending'|'failed'}`.
- RPC: `commerce.create_payment_intent(p_order, p_provider, p_idempotency) -> intent` (kiểm quyền owner/guest capability, gateway bật cho entity, không có intent mở, amount = due), `commerce.mark_intent(p_intent, p_state, p_session_ref)`, `commerce.expire_intents()`, `commerce.order_status(p_order) -> OrderStatusView`, `commerce.record_gateway_event(p_provider, p_event_ref, p_hash, p_outcome)`, `commerce.import_settlement(...)`, `commerce.close_settlement(p_id, p_note)`, `commerce.settle_refund(p_refund, p_gateway_ref, p_state)`.

- [ ] Unit: `toGatewayAmount('vnpay', 150000n) === '15000000'`; `stripe` giữ `150000`; `matchSettlement` phân loại 4 trạng thái và tính tổng phí.
- [ ] Integration `gateways.test.ts` (Edge local + Postgres): tạo intent cho đơn shop `bank` pending -> redirectUrl có chữ ký VNPay hợp lệ (verify lại bằng helper); IPN VNPay đúng chữ ký đúng tiền -> đơn `paid`, `payments.provider='vnpay'`, ledger `gateway_clearing` cân; IPN lặp -> cùng kết quả, một payment; IPN sai chữ ký -> 400-equivalent ack của cổng, không đổi đơn, `gateway_events outcome=signature_invalid`; IPN đúng chữ ký sai tiền -> ack lỗi, `amount_mismatch`; IPN sau khi intent `expired` và hold phòng hết -> `payments.state needs_review`, không chiếm phòng người khác; MoMo/ZaloPay/Stripe cùng bộ case qua fixture ký; tạo intent khi cổng tắt -> `GATEWAY_DISABLED`; hai `create_payment_intent` song song cùng đơn -> một intent; `approve_refund method=gateway` -> Edge refund fixture trả pending, `settle_refund` -> ledger `refund_payable/gateway_clearing`.
- [ ] Integration `settlement.test.ts`: import CSV fixture 5 dòng (1 khớp, 1 lệch tiền, 1 thiếu DB, 1 thiếu cổng, 1 phí) -> `settlement_lines.match_state` đúng, `gateway_fee` ghi sổ, `close_settlement` từ chối khi còn lệch chưa có lý do.
- [ ] Chạy fail; migration: constraints mở rộng, `payment_intents`, `gateway_events`, settlements, ledger accounts mới, RPC, cron `expire-intents`, permissions `payment.reconcile`, `settlement.import`, `gateway.refund`, runtime setting `payments.gateways` mặc định `{}`.
- [ ] Edge `payments`: router `/create`, `/ipn/<provider>`, `/webhook/stripe`, `/refund` (khóa nội bộ từ pg_net); adapter 4 cổng theo tài liệu hiện hành của từng cổng (kiểm lại URL sandbox/live, thuật toán HMAC, định dạng ack lúc implement; ghi version tài liệu vào ruling); Stripe dùng `npm:stripe` và `constructEventAsync`.
- [ ] UI: `/thanh-toan/[code]` liệt kê cổng bật cho entity/loại đơn + VietQR thủ công luôn có; `/thanh-toan/ket-qua` poll `order_status` 3 giây tối đa 2 phút, không ghi gì; admin: trạng thái cổng theo entity (bật/tắt, mode, kiểm kết nối sandbox), danh sách intent/gateway events theo đơn, hoàn qua cổng trong luồng refund GĐ0, đối soát: upload CSV/kéo Stripe, bảng lệch với owner, đóng kỳ.
- [ ] E2E `pay-gateway.spec.ts` (sandbox giả bằng Edge fixture `GATEWAY_FAKE=1` trả redirect về trang giả lập cổng local): mua hàng -> chọn VNPay -> "thanh toán" trên trang giả -> IPN -> `/thanh-toan/ket-qua` hiện đã thanh toán; đóng tab trước return (chỉ bắn IPN) -> `/toi/don-hang` thấy paid.
- [ ] Chạy tất cả; commit `feat: add gateway payment intents with verified ipn and reconciliation`.

**Done:** không đường nào ghi tiền ngoài IPN đã xác minh hoặc ghi tay có chứng cứ; replay/sai tiền/trễ đều an toàn; đối soát phân loại và đóng kỳ được; cổng tắt mặc định.

## T30. Khóa trả phí, mã giảm, referral, vé trả phí, bỏ giỏ

**Phụ thuộc:** T29. **Ước lượng:** 6-7 ngày.

**Files tạo:** `supabase/migrations/202704190001_paid_courses_coupons.sql`, `packages/core/src/commerce/{coupon,coupon.test,referral-risk,referral-risk.test}.ts`, `packages/api/src/coupons.ts`, `apps/web/src/app/(member)/learn/[slug]/mua/page.tsx`, `(member)/su-kien/[slug]/mua-ve/page.tsx`, `(member)/toi/gioi-thieu/page.tsx`, `apps/web/src/app/m/[code]/route.ts`, `apps/web/src/features/commerce/{coupon-field,order-summary}.tsx`, `apps/web/src/app/admin/{ma-gia-giam/page,hoa-hong/page}.tsx`, `tests/integration/paid-courses.test.ts`, `tests/integration/coupons-referrals.test.ts`, `tests/e2e/buy-course.spec.ts`.

**Files sửa:** `learn.publish_course` (cho price > 0), `events.publish_event` (tier), `learn.enroll_free` (từ chối khóa trả phí trừ entitlement T32), `learn.*` enrollments `revoked`, `commerce.request_refund` (self-service theo policy), `core.run_sequences`/seed sequence `cart.abandoned`, `cron cart-abandoned`, trang khóa/sự kiện public (giá, offers JSON-LD), `(member)/toi/khoa-hoc` (yêu cầu hoàn).

**Interfaces:**
- Produces: `applyCoupon(c: Coupon, subtotal: bigint, now: string, usage: {total: number; byUser: number}): CouponResult`; `referralRisk(input: {sameUser, sameVerifiedPhone, sameIp24h, refereeHadOrders}): string[]`.
- RPC: `learn.create_course_order(p_course_slug, p_bundle_slug, p_coupon, p_referral_code, p_idempotency) -> {orderId, total, nextPath}`, `events.create_ticket_order(p_slug, p_lines jsonb, p_coupon, p_idempotency)`, `commerce.check_coupon(CouponCheck)`, `commerce.redeem_coupon` (nội bộ khi paid), `commerce.record_referral_visit(p_code)` (cookie set ở route `/m/[code]`), `commerce.convert_referral(p_order)` (nội bộ khi completed), `commerce.review_referral(p_id, p_decision)`, `learn.request_course_refund(p_enrollment, p_reason)`, `commerce.save_coupon(jsonb)`, `commerce.save_commission_rule(jsonb)`.

- [ ] Unit: coupon percent 30% trên 1.000.000 = 300.000; fixed vượt subtotal cắt về subtotal; hết lượt/ngoài thời gian/min_total không đạt -> reason; `referralRisk` trả `['self']` khi cùng user, `['same_phone']`, `['same_ip_24h']`.
- [ ] Integration `paid-courses.test.ts`: tạo đơn khóa 1.290.000 với coupon 30% -> total 903.000; IPN paid (fixture T29) -> `enrollments source=paid`, ledger `revenue_course` + `payout_due` 70% khi khóa có `teacher_expert_id`; `enroll_free` khóa trả phí -> `VALIDATION`; hoàn trong 7 ngày progress 10% -> cho phép, enrollment `revoked`, ledger đảo; progress 25% -> `REFUND_NOT_ELIGIBLE`; bundle tách 2 dòng, giảm phân bổ tỷ lệ, tổng khớp; vé 2 hạng: mua 2 vé hạng A còn 1 -> `SOLD_OUT` không tạo đơn; paid -> 2 registrations có `tier_id`.
- [ ] Integration `coupons-referrals.test.ts`: coupon `max_uses=1` hai đơn paid song song -> một redemption; đơn hết hạn trả lượt; referral: referee tự dùng mã mình -> `VALIDATION`; referee đã có đơn paid trước -> không giảm; referral hợp lệ: đơn đầu giảm 30%, `completed` -> referrer +200 điểm một lần, `paid` chưa cộng; cùng IP 24h -> `risk_flags` và chưa cộng điểm tới khi `review_referral approve`; giỏ member 25 giờ không đổi không consent -> không có run; có consent -> run `cart.abandoned`, đặt hàng -> run `stopped`.
- [ ] Chạy fail; migration: course_prices, bundles, coupons, redemptions, referrals, commission_rules, payout_periods (draft), ticket_tiers, enrollments state, RPC, cron, permissions `coupon.manage`, `commission.manage`.
- [ ] UI: trang mua khóa/bundle với ô mã giảm (check server), tóm tắt, chuyển sang `/thanh-toan/[code]`; mua vé theo hạng; `/toi/gioi-thieu` mã + link + thống kê (không hoa hồng tiền, chỉ điểm); `/m/[code]` set cookie 30 ngày HttpOnly rồi redirect `/`; admin mã giảm (CRUD, lượt dùng), hoa hồng (quy tắc, kỳ nháp, tổng `payout_due` theo người nhận, xuất CSV), review referral rủi ro; trang khóa public hiện giá/giảm và JSON-LD `offers`.
- [ ] E2E `buy-course.spec.ts`: member mua khóa với coupon qua cổng giả -> được ghi danh, `/toi/khoa-hoc` có nút yêu cầu hoàn trong 7 ngày.
- [ ] Chạy tất cả; commit `feat: sell courses and tickets with coupons referrals and cart recovery`.

**Done:** mỗi đơn một mã, lượt đếm khi paid, referral chỉ thưởng khi completed và có kiểm rủi ro, hoàn khóa đúng điều kiện snapshot, vé không vượt tier.

## T31. Tư vấn 1:1

**Phụ thuộc:** T29. **Ước lượng:** 7-8 ngày.

**Files tạo:** `supabase/migrations/202705040001_consult.sql`, `packages/core/src/consult/{slots,slots.test,policy,policy.test}.ts`, `packages/api/src/consult.ts`, `supabase/functions/meet/index.ts`, `supabase/functions/_shared/google-jwt.ts`, `apps/web/src/app/(member)/chuyen-gia/[slug]/dat-lich/page.tsx`, `(member)/toi/tu-van/{page,[id]/page}.tsx`, `(member)/studio/{lich-ranh,buoi-tu-van,dich-vu}/page.tsx`, `(member)/studio/buoi-tu-van/[id]/page.tsx`, `apps/web/src/features/consult/{week-picker,slot-grid,availability-editor,note-form,review-form}.tsx`, `apps/web/src/app/admin/tu-van/page.tsx`, `tests/integration/consult.test.ts`, `tests/e2e/consult.spec.ts`.

**Files sửa:** `expert.services` (duration/buffer/lead), render_outbox (consult kinds), notify templates, `energy` (access_logs + `expert.shared_profile`), `/toi/cai-dat` (log truy cập hồ sơ), trang `/chuyen-gia/[slug]` (nút đặt lịch + lịch rảnh gần nhất), `commission_rules` fixture consult 8000bp, `docs/runbooks/keys.md` (`consult_notes_key`).

**Interfaces:**
- Produces: `generateSlots(rules, exceptions, bookings, service: {durationMin, bufferMin, minLeadHours}, weekStart, tz, now): Slot[]`; `consultRefund(policy, slotStart, now, cancelledBy: 'customer'|'expert'): {refundBp: number; reschedule: boolean}`.
- RPC: `expert.slots(SlotQuery)`, `expert.hold_consult(ConsultHold) -> {bookingId, orderId, heldUntil, nextPath}`, `expert.reschedule_consult(p_booking, p_start, p_expected_version)`, `expert.cancel_consult(p_booking, p_reason)`, `expert.complete_consult(p_booking)`, `expert.mark_no_show(p_booking)`, `expert.dispute_no_show(p_booking, p_note)`, `expert.save_note(p_booking, p_notes, p_next_step)`, `expert.my_note(p_booking)`, `expert.review_consult(p_booking, p_rating, p_review, p_anonymous)`, `expert.set_availability(jsonb)`, `expert.shared_profile(p_booking)`, `expert.set_meet(p_booking, p_url)` (ops/manual), `expert.enqueue_consult_reminders()`.

- [ ] Unit `slots.test.ts`: rule T2-T6 09:00-12:00, dịch vụ 60 phút buffer 15 -> 09:00, 10:15, 11:00 không có (11:00+60 > 12:00); exception nghỉ T3 -> không slot; booking 09:00-10:00 -> 09:00 unavailable và 10:15 là slot kế; slot trước `minLeadHours` bị loại. `policy.test.ts`: hủy trước 25 giờ -> 10000bp, trước 23 giờ -> 5000bp, chuyên gia hủy -> 10000bp luôn.
- [ ] Integration `consult.test.ts`: hai `hold_consult` cùng slot song song -> một `held`, một `SLOT_TAKEN`; hold hết 15 phút -> `expire_intents`/sweeper giải phóng, slot xuất hiện lại; IPN paid sau hết hạn khi slot còn trống -> `confirmed` (try_reallocate), khi slot đã bị người khác giữ -> `needs_review` + việc hoàn; paid -> Edge `meet` fixture trả URL, `consult.confirmed` outbox có link, link không có trong `public_profile`; reschedule trước 24h một lần ok, lần hai -> `INVALID_TRANSITION`; `complete_consult` -> ledger `revenue_consult` và `payout_due` 80%; `shared_profile` khi `share=false` -> `FORBIDDEN`, khi true nhưng ngoài cửa sổ -> `FORBIDDEN`, trong cửa sổ -> persona + chakra, không `answers`, có `access_logs`; `my_note` của chuyên gia khác -> `FORBIDDEN`; cột `notes_enc` không chứa plaintext; review trước `completed` -> `INVALID_TRANSITION`; review `published` chỉ sau editor duyệt.
- [ ] Chạy fail; migration: availability, consult_bookings với exclusion gist + `for update` trên expert, reviews, notes (pgp_sym Vault), access_logs, RPC, cron `consult-reminders`, permissions `consult.manage`, `review.moderate`, policy fixture trong `runtime_settings consult.policy`.
- [ ] Edge `meet`: JWT service account -> Calendar events.insert với `conferenceData` Meet, attendees khách + chuyên gia, hủy khi cancel; lỗi -> `meet_provider=manual` + outbox `consult.meet_manual` cho ops; test integration với `MEET_FAKE=1`.
- [ ] UI: W-64 chọn dịch vụ/tuần/slot theo múi giờ trình duyệt (hiển thị GMT+7 mặc định), ghi chú, toggle chia sẻ hồ sơ, tóm tắt, sang `/thanh-toan/[code]`; W-65 xác nhận có Meet/thêm lịch (.ics sinh server); W-66 danh sách sắp tới/đã qua, đổi/hủy theo chính sách hiển thị, đánh giá, báo cáo riêng, gợi ý bước tiếp; studio: lịch rảnh tuần + ngoại lệ + buffer, dịch vụ/giá, buổi của tôi với hồ sơ chia sẻ (nếu có), ghi chú mã hóa, gợi ý bước tiếp, no-show; admin tư vấn: mọi buổi, dán Meet tay, tranh chấp no-show, review duyệt; `/toi/cai-dat` hiện log ai đã xem hồ sơ khi nào.
- [ ] E2E `consult.spec.ts`: member đặt slot, trả qua cổng giả, thấy Meet; expert thấy buổi và hồ sơ chia sẻ; sau giờ, expert hoàn thành, member đánh giá.
- [ ] Chạy tất cả; commit `feat: add paid one-to-one consultations with meet and encrypted notes`.

**Done:** không trùng slot dưới tranh chấp, tiền trễ không chiếm slot người khác, hồ sơ năng lượng chỉ lộ đúng người đúng lúc có log, ghi chú chỉ chuyên gia đọc.

## T32. Premium, entitlement, nhóm VIP, KiotViet, vận chuyển

**Phụ thuộc:** T29, T30. **Ước lượng:** 7-8 ngày.

**Files tạo:** `supabase/migrations/202705180001_subscriptions_entitlements.sql`, `202705180002_kiotviet_shipping.sql`, `packages/core/src/commerce/{subscription,subscription.test}.ts`, `packages/api/src/{subscriptions,shipping}.ts`, `supabase/functions/{kiotviet-sync,shipping}/index.ts`, `supabase/functions/_shared/gateways/stripe.ts` (phần subscription webhook), `apps/web/src/app/(public)/premium/page.tsx`, `(member)/toi/premium/page.tsx`, `apps/web/src/app/admin/{thue-bao/page,kho/kiotviet/page}.tsx`, `tests/integration/{subscriptions,kiotviet,shipping}.test.ts`, `tests/e2e/premium.spec.ts`.

**Files sửa:** `stay.quote_stay` (dòng giảm Premium khi có entitlement), `learn.enroll_free`/`lesson_content` (premium), `community` policies (nhóm `vip`), `events.register` (healing circle miễn phí theo kỳ), checkout shop (báo phí GHN khi bật), `shop.transition_fulfillment` (`ready_to_ship` -> tạo vận đơn), `shop.regions` (nạp từ GHN), cron, render_outbox (subscription kinds), `.env.example`.

**Interfaces:**
- Produces: `nextPeriod(plan, from: string): string`; `subscriptionState(sub, now): {status, entitled: boolean, graceUntil?}` (past_due trong ân hạn vẫn entitled).
- RPC: `commerce.start_subscription(SubscribeInput) -> {checkoutUrl | orderId}`, `commerce.apply_stripe_invoice(p_invoice_id, p_customer, p_sub_id, p_period_start, p_period_end, p_amount, p_status)` (idempotent theo invoice), `commerce.renew_manual()`, `commerce.cancel_subscription(p_at_period_end bool)`, `commerce.subscription_tick()` (cron), `core.has_entitlement(p_code)`, `shop.apply_kiotviet_stock(jsonb)`, `shop.push_order_result(p_order, p_ref, p_ok, p_error)`, `shop.set_shipping_quote(p_order, p_fee, p_provider_payload)`, `shop.apply_shipping_event(p_order, p_state, p_payload)`.

- [ ] Unit: `nextPeriod('monthly','2027-05-18')` = `2027-06-18`; `subscriptionState` past_due ngày 3 ân hạn -> entitled true; ngày 8 -> false.
- [ ] Integration `subscriptions.test.ts`: Stripe `checkout.session.completed` + `invoice.paid` fixture -> subscription active, đơn `subscription` + payment stripe, `entitlements premium valid_until = period_end + grace`; cùng invoice gửi lại -> không đơn thứ hai; `invoice.payment_failed` -> past_due, entitlement còn; `invoice.paid` muộn trong ân hạn -> active, một đơn mới; hết ân hạn `subscription_tick` -> expired, entitlement hết, nhóm VIP membership `suspended`; ví VN: `renew_manual` tạo đơn, paid qua IPN -> kỳ mới; `quote_stay` của member Premium có dòng giảm 10% và policy snapshot ghi lý do; `lesson_content` bài premium không entitlement -> `ENTITLEMENT_REQUIRED`; healing circle thứ hai trong kỳ -> phải trả.
- [ ] Integration `kiotviet.test.ts` (Edge fixture `KIOTVIET_FAKE=1`): kéo tồn 3 SKU map -> `on_hand` showroom đổi, web `reserved` giữ; SKU không map không đổi; API lỗi -> không đổi tồn, `job_runs failed`, cảnh báo sau 2 lần; đẩy đơn `confirmed` một lần dù chạy hai lần; `sync_diffs` khi lệch > ngưỡng.
- [ ] Integration `shipping.test.ts` (`GHN_FAKE=1`): báo phí theo địa chỉ -> `shipping` item dùng phí GHN; GHN lỗi -> phí bảng cố định + cờ; `ready_to_ship` -> vận đơn tạo một lần; webhook `delivered` -> fulfillment `completed`; webhook sai token -> bỏ qua.
- [ ] Chạy fail; migrations: subscriptions, entitlements, kiotviet_links, sync_diffs, shipments cột mới, RPC, cron `subscription-renewal`, `kiotviet-sync`, permissions `subscription.manage`; `membership.benefits`, `shipping.provider`, `kiotviet.enabled` runtime settings mặc định tắt.
- [ ] Edge: Stripe subscription webhook trong `payments`; `kiotviet-sync` (OAuth client credentials, phân trang, rate limit); `shipping` GHN (fee, create, webhook). Mỗi function có chế độ FAKE cho test và `job_runs`.
- [ ] UI: `/premium` giá tháng/năm, quyền lợi từ cấu hình, chọn thẻ (Stripe) hoặc ví VN; `/toi/premium` trạng thái, kỳ, hủy, Portal Stripe, nút gia hạn ví VN; nhóm VIP tự xuất hiện; admin thuê bao (danh sách, trạng thái, gia hạn tay có chứng cứ qua record_payment); admin KiotViet (mapping, lần sync, lệch, bật/tắt); checkout hiện phí GHN và thời gian dự kiến khi bật.
- [ ] E2E `premium.spec.ts`: member mua Premium ví VN qua cổng giả -> bài premium mở, nhóm VIP có; hủy -> vẫn còn tới hết kỳ.
- [ ] Chạy tất cả; commit `feat: add premium membership entitlements kiotviet sync and carrier shipping`.

**Done:** entitlement đúng theo kỳ và ân hạn, không đơn trùng theo invoice, quyền lợi chỉ qua cấu hình, tồn/ship đồng bộ có last-good và cờ lỗi.

## T33. Give v1: tổ chức, xác minh, bản đồ, chiến dịch, quyên góp

**Phụ thuộc:** T29. **Ước lượng:** 7-8 ngày.

**Files tạo:** `supabase/migrations/202706010001_give_core.sql`, `packages/api/src/give.ts`, `apps/web/src/app/(public)/give/{page,ban-do/page,to-chuc/[slug]/page,chien-dich/[slug]/page,dang-ky-to-chuc/page}.tsx`, `(member)/give/chien-dich/[slug]/quyen-gop/page.tsx`, `(member)/give/cong-to-chuc/{page,chien-dich/[id]/page}.tsx`, `apps/web/src/features/give/{map,campaign-progress,donate-form,pledge-form,org-form,queries,actions}.tsx`, `apps/web/src/app/admin/give/{to-chuc,chien-dich,ban-do}/page.tsx`, `apps/web/src/app/api/give/receipt/[code]/route.ts`, `supabase/tests/database/give_rls.test.sql`, `tests/integration/give-donations.test.ts`, `tests/e2e/give-donate.spec.ts`.

**Files sửa:** role check (`charity_org`), `core.grant_role`, orders.kind `donation` (đã mở ở T29), `record_payment_atomic` ledger cho donation (`donation_fund` + `meta.campaign_id`), render_outbox (`donation.receipt`), `flags.ts` (`give`), header, `public-routes.ts`, `seed.sql` (`ZS-GIVE`, quỹ, tổ chức, chiến dịch), `lib/pdf` (biên nhận quyên góp dùng lại renderer chứng nhận).

**Interfaces:**
- RPC: `give.register_org(jsonb) -> id`, `give.verify_org(p_org, p_decision, p_note)` (aal2), `give.import_orgs(jsonb[])`, `give.suggest_org(jsonb)` (anon rate limit), `give.review_suggestion`, `give.save_campaign(jsonb)`, `give.publish_campaign(p_id, p_expected_version)`, `give.post_update(p_campaign, p_body, p_media)`, `give.review_update`, `give.donate(DonationInput) -> {orderId, nextPath}`, `give.pledge(p_campaign, p_item, p_qty)`, `give.receive_pledge(p_pledge)`, `give.campaign_public(p_slug)` (tiến độ từ sổ cái), `give.donor_wall(p_slug, p_page)` (ẩn danh tôn trọng), `give.my_donations()`.

- [ ] pgTAP `give_rls.test.sql`: anon đọc `orgs` chỉ `verified|listed`; `org_documents` không policy anon/member; thành viên org A không sửa campaign org B; `donations` (orders kind donation) owner-only; donor ẩn danh không xuất hiện tên trong `donor_wall`.
- [ ] Integration `give-donations.test.ts`: donate 50.000 với provider VietQR -> đơn `donation` entity nonprofit, không shipping, không VAT; ghi tiền thủ công có chứng cứ -> ledger nonprofit `bank`/`donation_fund` với `meta.campaign_id`, `campaign_public.raised` tăng; donate qua cổng khi nonprofit chưa bật cổng -> `GATEWAY_DISABLED`; donate dưới 10.000 -> `VALIDATION`; biên nhận PDF có mã, với ẩn danh vẫn có tên trong PDF cho người đó; `verify_org` bởi ops_finance aal1 -> MFA; publish chiến dịch của org chưa verified -> `VALIDATION`; pledge `received` tăng tiến độ hiện vật; `import_orgs` 100 dòng CSV fixture tạo `listed`, trùng tên+tỉnh bỏ qua; suggestion anon 6 lần/giờ -> `RATE_LIMITED`.
- [ ] Chạy fail; migration schema `give` (orgs, documents, members, suggestions, campaigns, updates, pledges, funds), role `charity_org`, RPC, buckets `give-docs` (private), `give-media` (public có duyệt), permissions, seed `ZS-GIVE`.
- [ ] UI: W-83 trang Give với số liệu từ sổ cái (không số giả), chiến dịch đang chạy; W-84 bản đồ Google Maps JS (key giới hạn domain, lazy, fallback danh sách khi không key) lọc mảng/tỉnh, đề xuất bổ sung; W-85 hồ sơ tổ chức; W-86 chiến dịch với tiến độ tiền/hiện vật/giờ và tab Cập nhật (tab Minh bạch ở T34); W-87 quyên góp: mức gợi ý, nhập tay, ẩn danh, lời nhắn, chọn VietQR/cổng -> `/thanh-toan/[code]`, biên nhận; W-92 đăng ký tổ chức nhiều bước + upload giấy tờ; W-93 cổng tổ chức phần chiến dịch/cập nhật; admin: xác minh tổ chức (MFA), duyệt chiến dịch/cập nhật/lời nhắn donor, nhập CSV bản đồ, duyệt đề xuất.
- [ ] E2E `give-donate.spec.ts`: member quyên góp qua cổng giả -> biên nhận, tiến độ tăng; anon xem chiến dịch không JS thấy mục tiêu và tiến độ.
- [ ] Chạy tất cả; commit `feat: add give organizations campaigns map and donations`.

**Done:** quyên góp là đơn thật ở entity nonprofit với sổ cái cân, tổ chức chỉ công khai sau xác minh aal2, tiến độ lấy từ sổ cái, giấy tờ không lộ.

## T34. Tình nguyện, giờ công, minh bạch chi tiêu, lợi nhuận trao đi

**Phụ thuộc:** T33, T30 (điểm). **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202706140001_give_volunteer_transparency.sql`, `packages/core/src/give/{expense-approval,expense-approval.test,profit-share,profit-share.test}.ts`, `apps/web/src/app/(member)/give/chien-dich/[slug]/tinh-nguyen/page.tsx`, `(member)/toi/phung-su/page.tsx`, `(member)/give/cong-to-chuc/{ca/page,chi-tieu/page,gio-cong/page}.tsx`, `apps/web/src/features/give/{shift-picker,transparency-table,expense-form,service-log-form}.tsx`, `apps/web/src/app/admin/give/chi-tieu/page.tsx`, `apps/web/src/app/ops/give/check-in/page.tsx`, `tests/integration/give-transparency.test.ts`, `tests/e2e/give-volunteer.spec.ts`.

**Files sửa:** `give/chien-dich/[slug]` (tab Minh bạch), `shop` products admin (`profit_share_bp`, quỹ), `shop` fulfillment completed hook (post `profit_share`), trang sản phẩm public (nhãn "trích x% doanh thu cho ..."), `points.rules` (`volunteer_hour`), `learn.badges` (phụng sự 10/50/100 giờ), render_outbox (`donation.spent`, `shift.confirmed`, `service.verified`, `expense.needs_approval`), cron `give-expense-overdue`.

**Interfaces:**
- Produces: `expenseNeeds(amount: bigint, threshold = 5_000_000n): number` (1 hoặc 2 người duyệt); `canPublishExpense(expense, approvals): {ok, reason}` (đủ số người, khác nhau, không phải người tạo khi 2); `profitShare(amountAfterDiscount: bigint, bp: number): bigint` (floor).
- RPC: `give.save_shift(jsonb)`, `give.register_shift(p_shift) -> {registrationId, ticketPath}`, `give.shift_code(p_registration)`, `give.checkin_shift(p_code)` (leader/org/staff `event.checkin` tại điểm), `give.log_service(p_registration, p_hours, p_note, p_photos)`, `give.verify_service(p_log, p_hours_verified)` (leader/org), `give.my_service()`, `give.submit_expense(ExpenseInput)`, `give.approve_expense(p_expense)`, `give.publish_expense(p_expense)`, `give.transparency(p_slug)` (thu/chi/số dư/bảng chi/quá hạn), `commerce.post_profit_share(p_order_item)` (nội bộ), `give.profit_share_report(p_from, p_to)`.

- [ ] Unit: `expenseNeeds(5_000_000n) = 1`, `(5_000_001n) = 2`; `canPublishExpense` với hai approval cùng người -> false; `profitShare(380000n, 5000) = 190000n`.
- [ ] Integration `give-transparency.test.ts`: đăng ký ca đầy -> `EVENT_FULL`; check-in bằng mã hai lần -> `INVALID_TRANSITION`; log 3 giờ chưa verify -> `my_service.hours = 0` xác nhận, verify 2.5 giờ -> điểm 25 (`volunteer_hour=10`, làm tròn xuống theo 0.5 giờ) một lần duy nhất; huy hiệu 10 giờ khi đủ; expense 6.000.000 cùng một người approve hai lần -> vẫn 1 approval, `publish` -> `APPROVAL_REQUIRED`; người thứ hai là ops_finance -> publish ok, ledger `donation_fund/bank` nonprofit cân, `transparency.spent` tăng, outbox `donation.spent` tới donor của chiến dịch; expense quá 72 giờ chưa publish -> cờ quá hạn; sản phẩm `profit_share_bp=5000` đơn completed -> event `profit_share` cân (`revenue_product` nợ 190.000, `profit_share_due` có), `profit_share_report` tổng đúng; hủy/hoàn đơn sau đó -> event đảo.
- [ ] Chạy fail; migration: shifts, registrations, service_logs, expenses, approvals, cột products, RPC, cron, badges fixture, permissions `give.approve_expense`, `give.org`.
- [ ] UI: W-88 chọn ca, cam kết, QR check-in, hướng dẫn tập trung; W-89 nhật ký phụng sự (giờ, ảnh, điểm, huy hiệu); tab Minh bạch W-86 (tổng thu từ sổ cái, tổng chi, số dư, bảng chi với chứng từ đã duyệt và người xác nhận, cảnh báo quá hạn, "kiểm toán" chỉ khi có file); cổng tổ chức: ca, xác nhận giờ, nộp chứng từ, trạng thái duyệt; admin chi tiêu: hàng đợi duyệt hai bước, publish; ops check-in ca tại điểm; trang sản phẩm nhãn trích doanh thu.
- [ ] E2E `give-volunteer.spec.ts`: member đăng ký ca, leader check-in, log giờ, leader xác nhận -> `/toi/phung-su` có điểm; org nộp chi 6 triệu -> cần 2 duyệt -> công khai.
- [ ] Chạy tất cả; commit `feat: add volunteering service hours and transparent campaign spending`.

**Done:** giờ công chỉ tính khi xác nhận, điểm một lần, chi lớn hai người khác nhau, minh bạch lấy từ sổ cái, trích doanh thu tự động và đảo được.

## T35. Phễu, báo cáo cảm xúc, đối soát kỳ, hardening L2, UAT, release

**Phụ thuộc:** T29-T34. **Ước lượng:** 5-6 ngày + UAT theo sprint.

**Files tạo:** `supabase/migrations/202706210001_gd2_reporting.sql`, `packages/core/src/commerce/{funnel,funnel.test}.ts`, `apps/web/src/features/admin/{funnel-chart,gmv-table}.tsx`, `tests/integration/gd2-reporting.test.ts`, `tests/e2e/{money-flows,security-payments}.spec.ts`, `docs/releases/{s9-s10,s11,s12,s13-s14}.md`, `docs/uat/{payments,courses-paid,consult,premium,give}.md`, `docs/runbooks/{subscriptions,give-transparency,kiotviet,shipping}.md`, `docs/security/asvs-l2-payments.md`, `docs/payments/go-live-checklist.md`.

**Files sửa:** `/admin` (khối GĐ2), `energy.report` v2 (cặp trước/sau stay/event), `crm.customer_timeline` v3 (consult, subscription, donation, volunteer; vẫn không energy), `tests/e2e/seo.spec.ts` (Give, offers), `accessibility.spec.ts` (6 trang mới), `tests/performance/public-pages.ts`, `README.md`, `docs/implementation-rulings.md`.

**Interfaces:**
- RPC: `commerce.funnel(p_entity, p_from, p_to, p_group_by week|source) -> rows{visitors (từ PostHog export hoặc null), signups, profiles, freeEnrollments, firstPaid, premium}`; `commerce.gmv(p_entity, p_from, p_to) -> byKind, commissionAccrued, subscriptions{active, pastDue, churned}, donationsByCampaign`; `energy.report` v2 thêm `beforeAfter{stay, event}`.
- Produces: `conversion(steps: number[]): number[]` (tỷ lệ từng bước, 0 khi mẫu rỗng).

- [ ] Unit: `conversion([100, 40, 20]) = [1, 0.4, 0.5]`; mẫu 0 không chia 0.
- [ ] Integration `gd2-reporting.test.ts`: funnel theo tuần từ fixture đúng số; GMV theo kind khớp tổng `orders.total` paid; `energy.report beforeAfter.stay` chỉ tính người có cả hai check-in `stay` quanh một booking và consent `research`, n < 20 -> null; timeline có `consult`/`donation` không có hồ sơ năng lượng.
- [ ] E2E `money-flows.spec.ts` (cổng giả): 6 luồng: đặt phòng cọc qua VNPay, mua hàng MoMo, ghi danh khóa ZaloPay, tư vấn Stripe, Premium ví VN, quyên góp VietQR thủ công; mỗi luồng tới biên nhận và `/toi` đúng mục.
- [ ] E2E `security-payments.spec.ts`: gọi IPN không chữ ký -> không đổi đơn; sửa `amount` trong form client -> server dùng intent; member A poll `order_status` đơn của B -> 403/404; expert A gọi `my_note` buổi của B -> 403; org A publish expense org B -> 403.
- [ ] Chạy fail; implement funnel/GMV RPC, dashboard GĐ2 (CSS bars), report v2, timeline v3; PostHog: `payment_started`, `payment_succeeded` (kind, provider, không số thẻ), `consult_booked`, `consult_completed`, `subscription_started|renewed`, `donation_made`, `volunteer_registered`, `referral_sent|converted` server-side.
- [ ] Hardening L2 phần tiền: checklist ASVS L2 với bằng chứng (chữ ký, replay, amount, secret rotation, logging không PII/PAN, rate limit); `pnpm audit --prod`; axe + performance template Give/Premium/consult; go-live checklist từng cổng (merchant, IP allowlist, webhook URL, secret live, giao dịch thử 10.000 đ + hoàn, người trực).
- [ ] Tài liệu: release notes S9-S14 với gate thực địa pending (giao dịch thật mỗi cổng, 20 buổi tư vấn, 10 thuê bao, tồn khớp showroom, chiến dịch thật), hợp đồng/pháp lý (merchant theo entity, pháp nhân nonprofit, chính sách hoàn, tỷ lệ chia ký, công thức lợi nhuận trao đi), UAT theo actor, runbooks, cập nhật README thứ tự đọc.
- [ ] Chạy full suite từng lệnh một dòng; `! grep -rE 'sb_secret_|service_role|VNPAY|MOMO|ZALOPAY|STRIPE_SECRET' apps/web/.next/static`; commit `docs: hand over gd2 payments and give release`.

**Done:** 6 luồng tiền xanh trên cổng giả và sandbox thật khi có; IDOR/chữ ký/amount deny pass; dashboard có GMV/phễu/thuê bao/quyên góp từ dữ liệu thật; release notes tách rõ code xong và gate cần người thật.

## 3. Checklist tự rà soát plan

- [ ] Mọi story MUST GĐ2 (thanh toán, ADM-03, LRN-04, MEM-03, EVT-02, bỏ giỏ, EXP-03, MEM-01, GIV-01..04, phễu) có task/RPC/test; SHOULD chọn (SHOP-03, vận chuyển API, ADM-05, COM-03 qua sự kiện) ghi lý do; NRG-04 và STAY-05 ghi hoãn.
- [ ] Không có đường ghi tiền ngoài IPN đã xác minh và ghi tay có chứng cứ; không `paid` từ return URL; secret không rời Edge.
- [ ] Mọi loại đơn mới dùng intent/hold/expire/reallocate/needs_review và policy snapshot; sổ cái mỗi event cân 0 và có test cho course, consult, subscription, donation, expense, profit_share, refund.
- [ ] Dữ liệu nhạy cảm: ghi chú tư vấn mã hóa chỉ chuyên gia đó; hồ sơ năng lượng chia sẻ theo buổi có cửa sổ và log; không vào timeline/analytics.
- [ ] Race: slot tư vấn, intent trùng, coupon lượt cuối, vé tier cuối, approve expense hai lần, invoice Stripe lặp.
- [ ] Review Focus 1-5 có test ở T29, T29, T31, T32, T34.
- [ ] Release tách test kỹ thuật, sandbox thật và gate thực địa; go-live từng cổng có checklist riêng.
