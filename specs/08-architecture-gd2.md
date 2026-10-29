# Kiến trúc GĐ2: phần bổ sung

Áp dụng `02-architecture.md`, `06-architecture-gd1.md` và rulings. GĐ2 là giai đoạn đầu tiên có secret cổng thanh toán và egress tiền thật: mọi chữ ký, API cổng, Google, KiotViet, GHN chỉ chạy trong Supabase Edge Functions; Next.js và SQL không bao giờ thấy secret cổng.

## 1. Schema mới và thay đổi

Schema mới: `give`. Mở rộng `commerce`, `expert`, `events`, `shop`, `core`, `energy`. Thêm `give` vào `config.toml`, `db:types`, `check-rls.mjs`, `check-types.mjs`.

| Schema | Bảng mới / thay đổi |
|---|---|
| commerce | orders.kind thêm `course, consult, event, subscription, donation`; payments.provider thêm `vnpay, momo, zalopay, stripe`; payment_intents(order_id, provider, amount, currency, state created/redirected/succeeded/failed/expired, provider_session_ref, redirect_url, expires_at, return_payload_hash, idempotency); gateway_events(provider, event_ref unique, payload_hash, received_at, outcome) append-only; gateway_settlements(provider, period, file_media_id, imported_by) + settlement_lines(settlement_id, provider_ref, amount, fee, settled_at, match_state, payment_id); coupons, coupon_redemptions(coupon_id, order_id unique, user_id); referrals; commission_rules; payout_periods(payee_type, payee_id, period, amount_due, state draft) (chi trả GĐ3); subscriptions; refund_requests thêm `method`, `gateway_ref`, `settled_at`; ledger_entries.account thêm `gateway_clearing, gateway_fee, revenue_course, revenue_consult, revenue_event, revenue_subscription, donation_fund, payout_due, profit_share_due`; ledger_events thêm `meta jsonb` (campaign_id, counterparty) |
| learn | course_prices, course_bundles, enrollments.source thêm `paid, premium`, enrollments.state thêm `revoked`, courses/lessons `is_premium` |
| events | ticket_tiers; registrations thêm `tier_id, order_item_id`; events.price bỏ ràng buộc = 0 trong `publish_event` khi có tier |
| expert | availability_rules, availability_exceptions, services thêm `buffer_min, min_lead_hours`, consult_bookings (exclusion gist theo expert_id + slot), consult_reviews(booking_id unique, rating, review, anonymous, status pending/published/hidden), consult_notes(booking_id unique, notes_enc bytea, next_step, updated_at) |
| energy | access_logs(user_id, accessed_by, purpose consult, booking_id, at) |
| core | entitlements(user_id, code, valid_until, source_type, source_id); role thêm `charity_org`; profiles thêm `referral_code unique`; deleted account giữ nguyên |
| shop | kiotviet_links, sync_diffs; shipments thêm `provider, provider_order_code, fee_quoted, events jsonb`; products thêm `profit_share_bp, give_fund_id` |
| give | orgs, org_documents, org_members, org_suggestions, campaigns, campaign_updates, item_pledges, shifts, shift_registrations, service_logs, expenses, expense_approvals(expense_id, approver_id unique per expense), funds(id, name, default_campaign_id) |

Ràng buộc: `payment_intents` partial unique `(order_id) where state in ('created','redirected')`; `gateway_events.event_ref` unique theo provider làm idempotency lớp Edge, `payments (provider, provider_ref)` unique làm idempotency lớp DB; `consult_bookings` exclusion + `select ... for update` trên dòng expert; `coupon_redemptions.order_id` unique; `referrals.referee_id` unique; `subscriptions` partial unique `(user_id) where status in ('trialing','active','past_due')`; `expenses` > 5.000.000 đ cần 2 dòng `expense_approvals` khác người trước `published` (check trong RPC); mọi ledger event vẫn cân 0.

## 2. Edge Functions

| Function | Vai trò | Secrets |
|---|---|---|
| `payments` (thay stub GĐ0) | `POST /create` (tạo intent, trả redirect/QR/session; caller JWT member hoặc guest capability), `POST /ipn/vnpay`, `/ipn/momo`, `/ipn/zalopay`, `/webhook/stripe` (xác minh chữ ký, ghi `gateway_events`, gọi `record_payment_atomic` bằng service role), `POST /refund` (chỉ từ `approve_refund` qua pg_net với khóa nội bộ) | `VNPAY_TMN_CODE/HASH_SECRET`, `MOMO_PARTNER_CODE/ACCESS_KEY/SECRET_KEY`, `ZALOPAY_APP_ID/KEY1/KEY2`, `STRIPE_SECRET_KEY/WEBHOOK_SECRET`, theo entity qua hậu tố `_<ENTITY_CODE>` |
| `_shared/gateways/{vnpay,momo,zalopay,stripe}.ts` | Adapter cùng interface: `createIntent(intent) -> {redirectUrl|qr|sessionId}`, `verify(req) -> {ok, providerRef, orderRef, amount, status}`, `ack(result) -> Response` (mã phản hồi riêng từng cổng), `refund(payment, amount, idem) -> {ref, state}` | |
| `meet` | Tạo/hủy Google Calendar event có Meet qua service account; gọi từ pg_net sau paid/cancel | `GOOGLE_SA_JSON` (Vault) |
| `kiotviet-sync` | Cron 10 phút: kéo tồn, đẩy đơn; `job_runs` | `KIOTVIET_CLIENT_ID/SECRET/RETAILER` |
| `shipping` | `quote`, `create`, `webhook/ghn` | `GHN_TOKEN/SHOP_ID` |
| `settlement-import` | Parse CSV settlement upload (private bucket `settlements`) hoặc kéo Stripe balance transactions; ghi `settlement_lines` và match | như payments |

Nguyên tắc adapter: xác minh chữ ký trước khi parse nghiệp vụ; so `amount` với `payment_intents.amount` (VNPay nhân 100, Stripe VND zero-decimal, kiểm tài liệu cổng hiện hành lúc implement); từ chối intent đã `expired` nhưng vẫn ghi `gateway_events` và chuyển tiền tới `needs_review` qua `record_payment_atomic` (tiền thật đã vào thì không được bỏ); mọi IPN trả đúng mã ack để cổng không retry vô hạn; log có correlation ID, không log secret hay toàn bộ payload thẻ. Sandbox và live là hai bộ secret, chọn theo `payments.gateways[provider].mode`.

## 3. Quyền

| Action | ops_finance | editor | expert | charity_org | super_admin |
|---|---|---|---|---|---|
| payment.reconcile, settlement.import | x | | | | aal2 |
| gateway.refund | aal2 | | | | aal2 |
| coupon.manage, subscription.manage, commission.manage | x (commission aal2) | | | | aal2 |
| consult.manage (xem mọi buổi, dán link Meet tay, no-show tranh chấp) | x | | own | | aal2 |
| review.moderate (consult_reviews, campaign_updates, donor messages) | | x | | | aal2 |
| give.verify (xác minh tổ chức) | aal2 | | | | aal2 |
| give.approve_expense | x | | | own org (người thứ 2 phải là ops_finance hoặc owner khác) | aal2 |
| give.content, give.import_map | | x | | | aal2 |
| give.org (CRUD chiến dịch, ca, chứng từ, xác nhận giờ) | | | | own org | aal2 |

Member: owner RLS như GĐ1; `core.has_entitlement(code)` dùng trong policy đọc `lessons where is_premium` và `community.groups kind vip`.

## 4. Contract bổ sung

```ts
type PaymentProvider = 'vnpay'|'momo'|'zalopay'|'stripe';
type CreateIntent = { orderId: UUID; provider: PaymentProvider; returnPath: string; idempotencyKey: UUID };
type IntentResult = { intentId: UUID; redirectUrl?: string; qrPayload?: string; stripeSessionId?: string; expiresAt: string };
type OrderStatusView = { orderId: UUID; code: string; status: string; paymentStatus: string; paid: Money; due: Money; nextPath: string };
type CouponCheck = { code: string; orderKind: OrderKind; subtotal: Money; itemRefs: UUID[] };
type CouponResult = { valid: boolean; discount: Money; reason?: string };
type SlotQuery = { expertSlug: string; serviceId: UUID; weekStart: string; tz: string };
type Slot = { start: string; end: string; available: boolean };
type ConsultHold = { serviceId: UUID; start: string; note?: string; shareProfile: boolean; idempotencyKey: UUID };
type SubscribeInput = { plan: 'monthly'|'yearly'; method: 'stripe'|'vn_wallet'; provider?: PaymentProvider };
type DonationInput = { campaignSlug: string; amount: Money; anonymous: boolean; message?: string; provider: PaymentProvider|'vietqr_manual'; idempotencyKey: UUID };
type ExpenseInput = { campaignId: UUID; title: string; amount: Money; spentAt: string; receiptMediaIds: UUID[] };
```

Mã lỗi mới: `GATEWAY_DISABLED` (503), `INTENT_EXPIRED` (409), `SIGNATURE_INVALID` (400, chỉ Edge), `COUPON_INVALID` (422), `SLOT_TAKEN` (409), `REFUND_NOT_ELIGIBLE` (409), `ENTITLEMENT_REQUIRED` (402), `APPROVAL_REQUIRED` (409).

Wrappers `packages/api/src/{payments,coupons,consult,subscriptions,give,shipping}.ts`:

| Wrapper | RPC / Edge |
|---|---|
| createIntent(CreateIntent) | Edge payments `/create` (qua Route Handler `/api/payments/create` để giữ cookie guest/member) |
| getOrderStatus(orderId) | `commerce.order_status` (owner hoặc guest capability) |
| checkCoupon(CouponCheck) / createCourseOrder(courseSlug|bundleSlug, coupon?, referral?) / createEventOrder(slug, lines, coupon?) | `commerce.check_coupon`, `learn.create_course_order`, `events.create_ticket_order` |
| listSlots(SlotQuery) / holdConsult(ConsultHold) / rescheduleConsult / cancelConsult / completeConsult / markNoShow / saveConsultNote / reviewConsult | `expert.slots`, `expert.hold_consult`, ... |
| subscribe(SubscribeInput) / cancelSubscription / renewManual | `commerce.start_subscription` (+ Edge payments cho Stripe session), `commerce.cancel_subscription`, `commerce.renew_manual` |
| donate(DonationInput) / pledgeItems / registerShift / checkinShift / logService / verifyService / submitExpense / approveExpense / publishExpense | `give.*` |
| requestRefund(orderId, amount, reason) (member self-service có điều kiện) | `commerce.request_refund` mở rộng kiểm policy snapshot |

## 5. Sổ cái

| Sự kiện | Nợ | Có |
|---|---|---|
| Cổng báo paid (mọi loại đơn) | gateway_clearing | deposit_liability (phòng, vé, tư vấn chưa diễn ra) hoặc receivable/revenue theo quy tắc ghi nhận hiện có; donation: donation_fund |
| Settlement về ngân hàng | bank, gateway_fee | gateway_clearing |
| Khóa paid | gateway_clearing | revenue_course (ghi nhận ngay, khóa tự học; hoàn trong 7 ngày đảo) + payout_due nếu khóa của chuyên gia theo commission_rules |
| Tư vấn completed | deposit_liability | revenue_consult, payout_due (80% fixture) |
| Thuê bao invoice paid | gateway_clearing | revenue_subscription theo kỳ (ghi nhận thẳng, kỳ ≤ 1 năm; tài chính duyệt phân bổ nếu cần) |
| Hoàn qua cổng settled | refund_payable | gateway_clearing |
| Lợi nhuận trao đi khi item product completed | revenue_product (phần trích) | profit_share_due; khi Operating chuyển tiền thật: profit_share_due nợ, bank có (Operating) và bank nợ, donation_fund có (nonprofit) |
| Chi chiến dịch published | donation_fund | bank (nonprofit) |

Entity: đơn Space/Connect ở Operating; donation và expenses ở nonprofit; `profit_share_due` là nghĩa vụ liên entity, báo cáo riêng, chuyển tiền thật do tài chính.

## 6. Job và outbox

Cron: `expire-intents` mỗi phút; `consult-reminders` 5 phút; `subscription-renewal` hằng ngày 08:00 (nhắc 7/1 ngày, chuyển past_due/expired, cập nhật entitlements); `cart-abandoned` mỗi giờ; `kiotviet-sync` 10 phút; `settlement-stripe` hằng ngày; `give-expense-overdue` hằng ngày (cảnh báo chi chưa công khai > 72 giờ).

Outbox kinds: `payment.succeeded` (biên nhận theo loại đơn), `payment.failed`, `refund.settled`, `course.purchased`, `consult.confirmed` (kèm Meet), `consult.reminder`, `consult.rescheduled`, `consult.cancelled`, `consult.next_step`, `subscription.started|renewed|past_due|expired|cancelled`, `cart.abandoned` (qua sequence), `donation.receipt`, `donation.spent` (khi expense published, gửi donor của chiến dịch), `shift.confirmed`, `service.verified`, `org.verified`, `expense.needs_approval`, `settlement.mismatch`.

## 7. Bảo mật thanh toán (ASVS L2 cho phần tiền)

- Webhook endpoints không dùng JWT; xác thực bằng chữ ký cổng; chặn replay bằng `gateway_events`; giới hạn kích thước body; chỉ chấp nhận IP cổng khi cổng công bố dải IP (VNPay/MoMo có, cấu hình allowlist tùy chọn).
- Trang return và poll không bao giờ thay đổi trạng thái tiền. Client không gửi số tiền; Edge lấy từ `payment_intents`.
- Secret theo môi trường và theo entity, xoay được; runbook `docs/runbooks/gateways.md`: bật/tắt khẩn một cổng, xử lý IPN trễ, đối soát lệch, hoàn thất bại.
- Dữ liệu thẻ không bao giờ chạm hệ thống (Stripe Checkout hosted, cổng VN redirect). Không lưu PAN, không lưu CVV, không lưu token thẻ ngoài Stripe customer id.
- `consult_notes.notes_enc` và `energy.access_logs`: chuyên gia chỉ giải mã ghi chú của mình; log truy cập hồ sơ năng lượng hiển thị cho khách.
- Rate limit: tạo intent 10/giờ/đơn, check coupon 30/giờ/IP, hold consult 5/giờ/user, donate 10/giờ/IP.

## 8. Route mới

| Prototype | Route | Task |
|---|---|---|
| W-19/W-32/W-65/W-71/W-87 bước thanh toán | `/thanh-toan/[orderCode]` (chọn cổng theo entity/loại đơn, VietQR dự phòng), `/thanh-toan/ket-qua` | T29 |
| W-53 mua khóa, W-70/71 vé | `/learn/[slug]/mua`, `/su-kien/[slug]/mua-ve` | T30 |
| W-48 referral | `/toi/gioi-thieu`, `/m/[code]` | T30 |
| W-64/65/66 | `/chuyen-gia/[slug]/dat-lich`, `/toi/tu-van`, `/toi/tu-van/[id]` | T31 |
| W-68 lịch rảnh, buổi, dịch vụ | `/studio/lich-ranh`, `/studio/buoi-tu-van`, `/studio/dich-vu` | T31 |
| W-47 | `/premium`, `/toi/premium` | T32 |
| W-83..W-89, W-92, W-93 | `/give`, `/give/ban-do`, `/give/to-chuc/[slug]`, `/give/chien-dich/[slug]` (tab minh bạch), `/give/chien-dich/[slug]/quyen-gop`, `/give/chien-dich/[slug]/tinh-nguyen`, `/toi/phung-su`, `/give/dang-ky-to-chuc`, `/give/cong-to-chuc/*` | T33, T34 |
| W-117, W-119, W-120, W-121, W-122 (chỉ đọc điểm) | `/admin/thanh-toan` (mở rộng: cổng, intent, đối soát, hoàn), `/admin/hoa-hong`, `/admin/ma-giam-gia`, `/admin/thue-bao`, `/admin/diem` (read) | T29, T30, T32 |
| W-127 | `/admin/give/{to-chuc,chien-dich,chi-tieu,ban-do}` | T33, T34 |
| W-112 GĐ2 | `/admin` khối phễu/GMV/thuê bao/quyên góp | T35 |

`FEATURES` thêm `gateways`, `paidCourses`, `consult`, `premium`, `give`. `publicRoutes()` thêm Give. JSON-LD: Course có `offers` khi trả phí, Event `offers` theo tier, `DonateAction` không bắt buộc.

## 9. Hoãn có chủ đích

W-26 cafe QR/POS; W-34/W-36 lô/vendor; W-46 ví điểm đổi/hạng (chỉ hiển thị số dư earn); W-48 affiliate; W-61 live class; W-68 soạn khóa/payout thực; W-72 chat livestream; W-73 retreat; W-90 gian hàng; W-91 học bổng; W-110 tư vấn 3 tầng showroom; W-119 chi trả payout (chỉ tạo kỳ nháp); W-132 BigQuery; Zalo login; SMS OTP.
