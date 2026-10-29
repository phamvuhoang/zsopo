# ZSOPO GĐ3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ dùng subagent-driven-development nếu người dùng cho phép cách thực hiện đó. Ghi ruling mới vào `docs/implementation-rulings.md`.

**Goal:** Đối tác tự kiếm tiền trên nền tảng (Studio, vendor, affiliate) với kỳ payout thật; retreat và gói đoàn; ví điểm có đổi và hạng; điểm thứ hai và tem lô; warehouse cho Holding; hệ thống chịu 500 người dùng đồng thời và sẵn sàng cho mobile.

**Architecture:** Payee và `payout_periods` hai bước là lớp chi tiền duy nhất; mọi nghĩa vụ chia sẻ ghi ở `orders.settled_at` thay vì lúc paid; video trả phí qua GCS + Transcoder + URL ký từ Edge `video`; retreat tái dùng events + room_allocations + installments; `dw` là view giả danh hóa xuất sang BigQuery bởi Edge `dw-export`; secret GCP chỉ ở Edge.

**Tech Stack:** như GĐ2, thêm `@google-cloud` REST qua fetch với JWT service account (không SDK), `k6` (binary, ngoài PR), Expo SDK ổn định (chỉ scaffold), NativeWind preset sinh từ tokens.

**Spec:** `../specs/09-product-gd3.md`, `../specs/10-architecture-gd3.md`; nền: `01`..`08`, `../docs/implementation-rulings.md`.

## Global Constraints

- Giữ Global Constraints GĐ0-GĐ2. Secret GCP, khóa CDN, salt dw chỉ ở Edge secrets; Next.js chỉ cầm URL ký ngắn hạn.
- Không có API ngân hàng: `payout_periods.paid` chỉ sau chuyển khoản tay có `evidence_media_id`; `approved_by <> reviewed_by`, approve aal2.
- `payout_due`, điểm `earn`, hoa hồng affiliate chỉ ghi ở `orders.settled_at` (qua cửa sổ hoàn), trừ consult giữ GĐ2.
- Dữ liệu sức khỏe retreat mã hóa, chỉ `retreat.manage` và người dẫn được gán đọc có log, xóa 30 ngày sau retreat; không vào `dw`, timeline, CSV, audit diff.
- `dw.*` không có cột cấm (`email, phone, name, full_name, address, answers, notes_enc, health_form_enc, id_doc_media_id`), `user_key` giả danh; kiểm tự động trong CI.
- Video trả phí không bao giờ public URL; token phát TTL 2 giờ gắn người dùng đã ghi danh; `VIDEO_FAKE`/`DW_FAKE` chỉ local và CI, `seed-validate --production` từ chối.
- Lô `bovis_final < 9000` không `on_sale`; trang lô luôn có câu miễn trừ cố định.
- Không thêm thư viện UI/chart/player/PDF; k6 và Expo chỉ ở `tests/load` và `apps/mobile`.

## Review Focus

1. Đơn khóa chuyên gia paid rồi hoàn trong 7 ngày: không được có `payout_due` nào cho chuyên gia, không có điểm `earn` cho khách; nếu hoàn sau `settled_at` thì có dòng điều chỉnh âm ở kỳ sau. Test T37.
2. Hai người cùng là ops_finance: A review rồi A approve kỳ payout: bị `PAYOUT_SAME_APPROVER`; B approve không aal2: bị từ chối; B approve aal2: thành công; `mark_paid` không có chứng từ: từ chối. Test T37.
3. Khách giữ suất retreat hạng "Nhà gỗ" cuối cùng, chưa cọc; khách hai giữ cùng hạng: nhận `EVENT_FULL`; khách một hết hạn 30 phút, khách hai giữ được; đồng thời lễ tân không thể đặt lẻ phòng trong block retreat (`ROOM_UNAVAILABLE`). Test T39.
4. Member có 1.000 điểm trong đó 400 hết hạn ngày mai: đổi 500 điểm cho đơn 200.000 đ bị `POINTS_CAP_EXCEEDED` (cap 30% = 60.000 đ = 600 điểm thì được, 700 không); đổi 600 dùng FIFO lấy 400 sắp hết hạn trước; hủy đơn trước thanh toán hoàn đúng 600 với hạn gốc. Test T40.
5. Export dw chạy hai lần cùng ngày và một lần sau khi một đơn đổi trạng thái: BigQuery (fake) không có dòng trùng theo khóa, dòng đơn phản ánh trạng thái mới, `reconcile` khớp; nếu view vô tình thêm cột `email` thì CI fail trước khi export chạy. Test T42.

## 1. Sprint, phụ thuộc và năng lực

| Sprint PRD | Task | Deliverable | Gate thực địa |
|---|---|---|---|
| S15 05-16/07 | T36 | Studio soạn khóa, video pipeline, duyệt, live, sự kiện chuyên gia | GCP project + Transcoder bật; 5 chuyên gia sẵn khóa |
| S16 19-30/07 | T37, T38 | Vendor portal, payee, kỳ payout hai bước, affiliate | Hợp đồng chuyên gia/vendor/affiliate; kế toán xác nhận khấu trừ |
| S17 02-13/08 | T39 | Retreat, cọc đợt, phiếu sức khỏe, hợp đồng OTP, chặn phòng, B2B | Pháp lý duyệt điều khoản retreat; 1 retreat thật mở bán |
| S18 16-27/08 | T40, T41 | Điểm đổi, hạng, học bổng; tạo điểm mới, lô và tem | Quy tắc điểm và tên hạng chốt; điểm thứ hai có pháp nhân |
| S19 30/08-10/09 | T42 | dw views, Edge `dw-export`, BigQuery, Looker, đối chiếu | GCP billing; email ban điều hành cho Looker |
| S20 13-24/09 | T43 | k6, tối ưu, pentest nhẹ, on-call, CWV, mobile scaffold, UAT, release | Staging có dữ liệu lớn; người trực 48 giờ sau release |

Critical path: T36 -> T37 -> T38 -> T39 -> T40 -> T41 -> T42 -> T43; T38 và T41 có thể song song với task cùng sprint nếu hai người. Kỳ payout tháng 7 đóng trước 10/08 nghĩa là T37 phải xong trước 31/07 và chạy `payout-draft` ngày 01/08. Ước lượng 65-80 engineer-days cho hai người; một người thì cắt theo thứ tự: Looker (giữ BigQuery + SQL), B2B (giữ form + email), live sessions, tem PDF (giữ trang lô), học bổng, mobile scaffold (giữ lint `packages/api`), pentest ngoài (giữ checklist nội bộ).

## 2. Quy ước

Như GĐ0-GĐ2. Helper mới `tests/integration/helpers.ts`: `asExpert(slug)`, `asVendor(slug)`, `asAffiliate(code)`, `settleOrder(orderId)` (lùi `paid_at` qua cửa sổ hoàn rồi gọi `commerce.settle_orders()`), `fakeVideoReady(assetId)`, `signOtp(bookingId)` đọc OTP từ outbox test. Fixture: 2 chuyên gia có payee, 1 vendor `tra-hoa-cuc-trai-mat` có 3 sản phẩm, 1 affiliate approved, 1 retreat 2N1Đ tại L1 với 2 hạng phòng, `point_rules` 5 loại đơn, `membership_tiers` 4 hạng, L3 đổi thành `farmstay` trạng thái `test`, 2 lô (1 on_sale 9.400, 1 held 8.600), quỹ học bổng gắn chiến dịch GĐ2. Secret giả `GCP_SA_JSON_*` là JSON khóa RSA tự sinh trong `functions/.env.example`.

## T36. Expert Studio: khóa, video, duyệt, live, sự kiện chuyên gia

**Phụ thuộc:** GĐ2 hoàn tất. **Ước lượng:** 9-10 ngày.

**Files tạo:** `supabase/migrations/202707050001_studio_video.sql`, `supabase/functions/video/index.ts`, `supabase/functions/_shared/gcp/{jwt,gcs,transcoder,cdn-sign}.ts`, `packages/core/src/learn/{review-checklist,review-checklist.test,video-state,video-state.test}.ts`, `packages/api/src/studio.ts`, `apps/web/src/app/studio/khoa-hoc/{page,moi/page,[id]/page,[id]/hoc-vien/page,[id]/live/page}.tsx`, `apps/web/src/app/studio/su-kien/{page,[id]/page}.tsx`, `apps/web/src/features/studio/{course-editor,lesson-editor,video-uploader,review-status,live-list,event-editor}.tsx`, `apps/web/src/app/admin/khoa-hoc/duyet/{page,[id]/page}.tsx`, `apps/web/src/app/admin/su-kien/duyet/page.tsx`, `apps/web/src/app/(member)/learn/[slug]/live/page.tsx`, `tests/integration/{studio,video}.test.ts`, `tests/e2e/studio-course.spec.ts`, `supabase/tests/database/studio_rls.test.sql`, `docs/runbooks/video.md`.

**Files sửa:** `learn.publish_course` (chỉ editor/`course.publish` gọi sau duyệt; chủ khóa không tự publish), `learn.validate_lesson` (video `{provider: gcs, video_asset_id}` phải `ready`), player video GĐ1 (nhận `PlayTicket` khi provider gcs), `events.publish_event` (từ `in_review`), `learn.enroll_*` không đổi, `core.role_permissions` thêm `course.review`, `event.review`, `functions/.env.example`, `helpers.ts`, `config.toml` (không thêm schema).

**Interfaces:**
- Produces: `evaluateChecklist(items, template): {complete, failed: string[]}`; `nextVideoState(current, event): VideoState` (uploading -> processing -> ready|failed, không lùi).
- RPC: `learn.studio_upsert_course(p_payload) -> course` (owner, chỉ `draft|rejected`), `learn.studio_submit(p_course) -> course` (`REVIEW_CHECKLIST_INCOMPLETE` nếu thiếu bài, `VIDEO_NOT_READY` nếu bài video chưa ready; tạo `course_revisions`), `learn.review_course(p_revision, p_checklist, p_decision, p_note)` (`course.review`; approve -> áp snapshot và `publish_course`), `learn.studio_students(p_course)`, `learn.create_live(p_course, p_payload)`, `learn.live_link(p_live)` (ghi danh và trong cửa sổ 15 phút), `learn.register_video(p_course, p_meta) -> asset`, `learn.set_video_state(p_asset, p_state, p_meta)` (service role từ Edge), `learn.play_ticket_allowed(p_asset) -> bool`, `events.studio_upsert_event`, `events.studio_submit_event`, `events.review_event`.
- Edge `video`: `/upload-url`, `/ingest`, `/callback`, `/play` theo `10-architecture-gd3.md` mục 2.

- [ ] Unit: `evaluateChecklist` với 8 mục thiếu 1 -> `complete=false`; `nextVideoState('ready','failed')` giữ `ready`.
- [ ] Integration `studio.test.ts`: expert tạo khóa giá 500.000 đ, 2 chương 4 bài; submit thiếu video ready -> `VIDEO_NOT_READY`; `fakeVideoReady` rồi submit -> `in_review`, outbox `course.submitted`; expert khác đọc khóa -> 0 dòng (RLS); editor review 1 mục fail -> `rejected` có lý do, outbox `course.decided`; sửa và submit lại; approve -> `published`, enroll được; sửa khóa published tạo revision mới, học viên vẫn thấy bản cũ tới khi approve; `studio_students` chỉ trả tiến độ, không email; live: `live_link` trước 16 phút -> `LESSON_LOCKED`, trong 15 phút -> url; event chuyên gia tại L1 submit -> `in_review`, review approve -> published với `host_expert_id`.
- [ ] Integration `video.test.ts` (Edge local `VIDEO_FAKE=1`): `/upload-url` cho khóa của người khác -> 403; upload quá `video.max_bytes` -> 413; `/play` khi chưa ghi danh -> 403, chủ khóa -> ok, reviewer -> ok, đã ghi danh -> URL có chữ ký và `expiresAt` ≤ 2 giờ; `/callback` không OIDC -> 401.
- [ ] pgTAP `studio_rls`: `course_revisions`, `video_assets`, `live_sessions` own; member không select `video_assets.gcs_object`.
- [ ] Chạy fail; migration: cột và bảng mục 1, RPC, permissions, runtime `learn.review_checklist` fixture 8 mục, `video.max_bytes` 4 GB, outbox kinds, cron `video-poll`, `live-reminders`.
- [ ] Edge `video` + `_shared/gcp`: JWT RS256 từ SA JSON, GCS v4 signed resumable URL, Transcoder job HLS 3 bitrate, CDN signed URL prefix; `VIDEO_FAKE` dùng bucket Supabase `video-dev` và đánh `ready` sau 5 giây.
- [ ] UI Studio (W-68): danh sách khóa với trạng thái, editor chương/bài kéo thả (native drag events), uploader resumable có tiến trình và trạng thái xử lý, giá/giảm/bundle (GĐ2), preview, nút gửi duyệt với checklist tự kiểm; admin duyệt: hàng chờ, so sánh snapshot với bản publish, chấm checklist, quyết định; live list; sự kiện chuyên gia dùng form sự kiện GĐ1/GĐ2 bớt trường.
- [ ] E2E `studio-course.spec.ts`: expert tạo khóa, upload video fake, gửi duyệt; editor duyệt; member mua (cổng giả) và xem bài video qua ticket; URL manifest sau 2 giờ (mock clock) -> 403.
- [ ] Chạy tất cả; commit `feat: add expert studio course authoring with gcs video pipeline and review`.

**Done:** chuyên gia tự soạn và gửi duyệt khóa có video riêng; không ai publish khóa chưa duyệt; video trả phí chỉ phát qua ticket ngắn hạn; live và sự kiện chuyên gia đi qua duyệt.

## T37. Vendor portal, payee, kỳ payout hai bước

**Phụ thuộc:** T36. **Ước lượng:** 7-8 ngày.

**Files tạo:** `supabase/migrations/202707190001_payouts_vendors.sql`, `supabase/functions/payouts-export/index.ts`, `packages/core/src/commerce/{payout-calc,payout-calc.test,share-split,share-split.test}.ts`, `packages/api/src/{vendor,payouts}.ts`, `apps/web/src/app/vendor/{page,san-pham/page,san-pham/[id]/page,ton-kho/page,don-hang/page,doanh-thu/page,hop-dong/page}.tsx`, `apps/web/src/app/studio/{doanh-thu/page,tai-khoan-nhan-tien/page}.tsx`, `apps/web/src/features/payouts/{period-table,approve-dialog,payee-form}.tsx`, `apps/web/src/app/admin/kho/vendor/{page,[id]/page}.tsx`, `apps/web/src/app/admin/payout/{page,[id]/page}.tsx`, `tests/integration/{vendor,payouts}.test.ts`, `tests/e2e/payout-cycle.spec.ts`, `supabase/tests/database/{vendor_rls,payout_rls}.test.sql`, `docs/runbooks/payouts.md`.

**Files sửa:** `commerce.post_ledger` (accounts `tax_withheld`, `scholarship_expense`), bút toán `payout_due` course/event (T36/GĐ2) chuyển sang `commerce.settle_orders()`, `shop.place_order` (dòng vendor giữ `vendor_id` trong `order_items.meta`), `shop.products` RLS (vendor own), `core.role_permissions` (`vendor.manage`, `payout.review`, `payout.approve` aal2), `core.role` check (`vendor`), `crm.customer_timeline` (không đổi), `functions/.env.example`, `helpers.ts`.

**Interfaces:**
- Produces: `splitShare(lineAmountVnd: bigint, rateBp: number, profitShareBp: number): {platform, payee, profitShare}` (làm tròn xuống về đ, phần dư về platform); `computePayout(lines, {minAmount, taxThreshold, taxBp}): {gross, taxWithheld, net, belowMin}`.
- RPC: `commerce.settle_orders()` (cron: đặt `settled_at`, ghi `payout_due` theo `commission_rules`, điểm earn T40 gọi cùng chỗ), `commerce.upsert_payee(p_kind, p_ref, p_payload)` (own hoặc `payout.review`), `commerce.draft_payout_periods(p_entity, p_period)` (cron ngày 1 hoặc tay), `commerce.review_payout(p_period, p_note)`, `commerce.approve_payout(p_period)` (aal2, `PAYOUT_SAME_APPROVER`), `commerce.mark_payout_paid(p_period, p_evidence_media, p_paid_at)`, `commerce.void_payout(p_period, p_reason)`, `commerce.my_payouts()`, `commerce.payout_adjust(p_payee, p_amount, p_reason)` (dòng kỳ sau), `shop.vendor_upsert_product`, `shop.vendor_submit_product`, `shop.review_product(p_product, p_decision, p_note)`, `shop.vendor_set_stock(p_variant, p_qty)` (từ chối khi có `kiotviet_links`), `shop.vendor_orders()` (view ẩn email/SĐT).
- Edge `payouts-export`: `POST /csv?period=` -> file vào bucket `finance`, trả URL ký 10 phút.

- [ ] Unit: `splitShare(100000n, 2000, 500)` = platform 20.000, profitShare 5.000, payee 75.000; `computePayout` tổng 1.900.000 không khấu trừ, 2.000.000 khấu trừ 200.000, 400.000 -> `belowMin`.
- [ ] Integration `vendor.test.ts`: vendor tạo sản phẩm thiếu ảnh thứ 3 -> 422; submit -> `in_review`; editor approve -> `active`; vendor sửa giá -> `pending_changes`, giá bán chưa đổi; vendor đọc đơn -> chỉ dòng hàng mình, không có email; vendor B đọc sản phẩm A -> 0 dòng; `vendor_set_stock` khi có KiotViet link -> 409.
- [ ] Integration `payouts.test.ts`: đơn khóa chuyên gia paid -> chưa có `payout_due`; `settleOrder` -> `payout_due` 350.000 cho khóa 500.000 (7000bp); hoàn trước settle -> không có nghĩa vụ; hoàn sau settle -> dòng âm; `draft_payout_periods` tháng gom đúng dòng, không gom dòng đã vào kỳ; payee thiếu -> `PAYEE_MISSING` và kỳ bỏ qua payee đó; Review Focus 2 đầy đủ; `mark_paid` ghi sổ `payout_due` giảm, `bank` giảm, `tax_withheld` tăng, cân 0; `my_payouts` của expert chỉ thấy kỳ mình; `payouts-export` CSV có số tài khoản chỉ cho `payout.review`.
- [ ] pgTAP: `payees` own + finance; `payout_periods`/`payout_lines` payee chỉ select kỳ mình; `shop.products` vendor own theo `vendor_id`.
- [ ] Chạy fail; migration: bảng mục 1 (`payees`, `payout_lines`, `installments` dùng T39, `vendors`, cột products), accounts, RPC, cron `orders-settle`, `payout-draft`, permissions, runtime `payout.min_amount` 500.000, `payout.tax_threshold` 2.000.000, outbox kinds payout/product.
- [ ] UI: vendor portal (W-36) 6 mục; Studio doanh thu (W-68 sổ cái, kỳ, chứng từ, xuất CSV) và form tài khoản nhận tiền; admin vendor (duyệt sản phẩm, hợp đồng, hoa hồng) và payout (W-119: kỳ theo payee, review, approve aal2, upload chứng từ, mark paid, void, điều chỉnh).
- [ ] E2E `payout-cycle.spec.ts`: tạo đơn khóa + đơn hàng vendor (cổng giả), settle, draft kỳ, A review, B approve với aal2, upload chứng từ, mark paid; expert thấy kỳ paid và tải CSV.
- [ ] Chạy tất cả; commit `feat: add vendor portal, payees and two-step payout periods`.

**Done:** nghĩa vụ chỉ sinh sau cửa sổ hoàn; kỳ payout đóng được với hai người khác nhau và chứng từ; vendor tự quản sản phẩm qua duyệt và không thấy PII khách.

## T38. Affiliate

**Phụ thuộc:** T37. **Ước lượng:** 3-4 ngày.

**Files tạo:** `supabase/migrations/202707190002_affiliate.sql`, `packages/core/src/commerce/{affiliate-attribution,affiliate-attribution.test}.ts`, `packages/api/src/affiliate.ts`, `apps/web/src/app/a/[code]/route.ts`, `apps/web/src/app/(member)/toi/affiliate/page.tsx`, `apps/web/src/features/affiliate/{apply-form,stats,links}.tsx`, `apps/web/src/app/admin/affiliate/{page,[id]/page}.tsx`, `tests/integration/affiliate.test.ts`, `tests/e2e/affiliate.spec.ts`, `supabase/tests/database/affiliate_rls.test.sql`.

**Files sửa:** mọi `place_order`/`create_*_order` (nhận `p_affiliate_cookie` và gọi `commerce.attach_affiliate`), `commerce.settle_orders()` (hoa hồng affiliate), `commerce.apply_coupon` GĐ2 (coupon có `affiliate_id` gắn đơn), `core.role_permissions` (`affiliate.manage`), middleware Next (đọc cookie `zs_aff` cho server action), `account-delete`.

**Interfaces:**
- Produces: `resolveAttribution({cookie, referralCode, buyerId, affiliateUserId}): {affiliateId?: string, referralUserId?: string, reason}` (loại trừ nhau, ưu tiên cookie mới hơn, self -> không).
- RPC: `commerce.affiliate_apply(p_payload)`, `commerce.affiliate_decide(p_affiliate, p_decision)` (`affiliate.manage`, cần payee), `commerce.record_affiliate_click(p_code, p_cookie, p_landing, p_utm, p_ip_hash)` (rate limit 60/phút/IP), `commerce.attach_affiliate(p_order, p_cookie)` (`AFFILIATE_SELF_PURCHASE` -> bỏ qua không lỗi với khách), `commerce.affiliate_stats()`.
- Route `/a/[code]`: ghi click, set cookie `zs_aff` httpOnly SameSite=Lax 30 ngày ký HMAC, redirect về `?to=` trong allowlist nội bộ.

- [ ] Unit: cookie của chính affiliate -> `reason: self`; cookie 31 ngày -> không gắn; cookie 5 ngày và referral 10 ngày -> affiliate.
- [ ] Integration: apply -> pending; decide approve thiếu payee -> `PAYEE_MISSING`; click ghi và purge > 90 ngày; đơn sản phẩm 1.000.000 đ gắn affiliate, settle -> `payout_due` 80.000 (8%); đơn khóa 10%; đơn quyên góp 0; hoàn trước settle -> 0; affiliate tự mua -> không gắn; affiliate đọc stats chỉ mình; `/a/x?to=https://evil` -> redirect `/`.
- [ ] pgTAP: `affiliates`, `affiliate_clicks` own + manage; member thường không insert click trực tiếp.
- [ ] Chạy fail; migration, route, UI (W-48: đăng ký, hợp đồng upload bởi finance, link/mã, thống kê, hoa hồng chờ/khả dụng/đã trả, ngưỡng rút hiển thị), admin duyệt và bảng hoa hồng.
- [ ] E2E: khách mở `/a/CODE`, mua hàng (cổng giả), settle, affiliate thấy hoa hồng chờ; kỳ payout T37 gom affiliate.
- [ ] Commit `feat: add affiliate program with server-side attribution and payouts`.

**Done:** attribution chỉ do server quyết; hoa hồng chỉ sau settle; affiliate đi chung kỳ payout.

## T39. Retreat, cọc theo đợt, phiếu sức khỏe, hợp đồng OTP, chặn phòng, B2B

**Phụ thuộc:** T37 (installments). **Ước lượng:** 8-9 ngày.

**Files tạo:** `supabase/migrations/202708020001_retreat_b2b.sql`, `packages/core/src/events/{deposit-schedule,deposit-schedule.test,itinerary,itinerary.test}.ts`, `packages/api/src/{retreat,b2b}.ts`, `apps/web/src/app/(public)/retreat/{page,[slug]/page,[slug]/dat/page}.tsx`, `apps/web/src/app/(member)/toi/retreat/[code]/page.tsx`, `apps/web/src/features/retreat/{room-type-picker,installment-plan,health-form,contract-sign,prep-checklist,transfer-dialog}.tsx`, `apps/web/src/app/(public)/doan/{page,da-nhan/[code]/page}.tsx`, `apps/web/src/app/admin/retreat/{page,[id]/page}.tsx`, `apps/web/src/app/admin/doan/{page,[id]/page}.tsx`, `apps/web/src/app/ops/retreat/check-in/page.tsx`, `apps/web/src/app/ops/doan/page.tsx`, `tests/integration/{retreat,b2b}.test.ts`, `tests/e2e/retreat.spec.ts`, `supabase/tests/database/retreat_rls.test.sql`, `docs/runbooks/retreat.md`.

**Files sửa:** `events.publish_event` (kind retreat: kiểm `retreats` đủ, tạo block `room_allocations kind=retreat`), `stay.hold_room`/manual booking (tôn trọng block), `commerce.record_payment_atomic` (gán `installments.paid_at` theo thứ tự), `commerce.approve_refund` (chính sách retreat snapshot), `ops.create_manual_booking` GĐ0 (nhiều phòng, nguồn `b2b`, `installments`, `meta.invoice`), `account-delete`, `core.role_permissions` (`retreat.manage`, `retreat.checkin`, `retreat.health_read`, `b2b.manage`), `apps/web/src/lib/seo/public-routes.ts` (`/retreat/*`, `/doan`).

**Interfaces:**
- Produces: `buildInstallments(total: bigint, schedule: {seq, rateBp, dueRule}[], startsAt: Date, now: Date): Installment[]` (tổng bằng total, phần dư vào đợt cuối, hạn đã qua lúc đặt thì gộp vào đợt 1); `validateItinerary(days, startsAt, endsAt): string[]`.
- RPC: `events.upsert_retreat(p_event, p_payload)`, `events.hold_retreat(p_event, p_room_type, p_pax, p_guest, p_idempotency) -> order` (30 phút, `EVENT_FULL` theo capacity hạng), `events.assign_retreat_room(p_booking, p_room)` (sau đợt 1 paid, trong `room_ids` hạng), `events.submit_health_form(p_booking, p_form)` (mã hóa, không log), `events.read_health_form(p_booking)` (`retreat.health_read`, ghi `retreat_access_logs`), `events.request_contract_otp(p_booking)`, `events.sign_contract(p_booking, p_otp)` (`OTP_INVALID`), `events.transfer_retreat(p_booking, p_new_customer_email)` + xác nhận hai email, `events.retreat_checkin(p_booking)`, `events.retreat_purge_health()` (cron), `stay.create_group_request(p_payload)` (rate limit, mã `B2B-NNNN`), `stay.update_group_request(p_id, p_status, p_media)`, `stay.convert_group_request(p_id, p_rooms, p_schedule) -> order`.

- [ ] Unit: `buildInstallments(10_000_000n, [30% ngay, 70% 14 ngày trước], ...)` = 3.000.000 + 7.000.000; đặt khi còn 10 ngày -> một đợt 10.000.000; `validateItinerary` thiếu ngày 2 -> lỗi.
- [ ] Integration `retreat.test.ts`: publish thiếu hạng phòng -> 422; publish -> `room_allocations kind=retreat` cho 4 phòng; lễ tân đặt lẻ phòng trong block -> `ROOM_UNAVAILABLE`; Review Focus 3 đầy đủ; cọc đợt 1 qua cổng giả -> `deposited`, `deposit_liability`, outbox; `assign_retreat_room` phòng ngoài hạng -> 422; health form: member khác đọc -> 403, `retreat.manage` đọc -> có log; sign OTP sai -> `OTP_INVALID`, đúng -> `contract_signed_at` và hash; hủy 15 ngày trước -> refund 100% đợt 1; hủy 10 ngày trước -> `REFUND_NOT_ELIGIBLE`, transfer -> customer mới sau hai xác nhận; `installments-remind` đánh overdue; purge sau 30 ngày xóa `health_form_enc` giữ booking; Premium giảm 10% trên tổng.
- [ ] Integration `b2b.test.ts`: form 61 lần/phút -> rate limit; tạo -> mã `B2B-0001` tăng, outbox `b2b.received`; `convert` tạo đơn `stay` 5 phòng nguồn `b2b` với 2 đợt và `meta.invoice`; location_manager L2 không thấy yêu cầu L1.
- [ ] pgTAP: `retreats` public select khi event published; `retreat_bookings` own không có `health_form_enc` (view `retreat_bookings_me`); `group_requests` theo điểm.
- [ ] Chạy fail; migration (kind retreat, bảng, Vault key `health_form_key`, RPC, cron `retreat-health-purge`, `installments-remind`, permissions, outbox kinds, chính sách `retreat` vào `policy_versions` kind mới fixture 14 ngày).
- [ ] UI: W-73 chi tiết với lịch trình theo ngày, 5 bước đặt, trang chuẩn bị với checklist và đợt tiếp; W-25 form đoàn + trang "đã nhận"; admin retreat (hạng phòng, gán phòng, phiếu sức khỏe có cảnh báo log, hợp đồng, đợt, chuyển nhượng), admin đoàn (pipeline, upload báo giá/hợp đồng, chuyển thành booking), ops check-in retreat.
- [ ] E2E `retreat.spec.ts`: khách chọn hạng, giữ suất, cọc đợt 1 (cổng giả), nộp phiếu sức khỏe, ký OTP (đọc từ Mailpit), thấy trang chuẩn bị; lễ tân thấy phòng bị block trong sơ đồ.
- [ ] Commit `feat: add retreat packages with installments, health forms, e-sign and room blocks; add b2b group requests`.

**Done:** retreat bán được qua web với cọc đợt, phòng bị chặn đúng, dữ liệu sức khỏe mã hóa có log và tự xóa; B2B từ form đến booking nhiều phòng.

## T40. Ví điểm: quy tắc, đổi điểm, hạng, học bổng

**Phụ thuộc:** T37 (settle). **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202708160001_points_tiers.sql`, `packages/core/src/commerce/{points,points.test,tiers,tiers.test}.ts`, `packages/api/src/points.ts`, `apps/web/src/app/(member)/toi/diem/page.tsx`, `apps/web/src/features/points/{wallet,ledger,redeem-box,tier-card}.tsx`, `apps/web/src/app/admin/diem/{page,quy-tac/page,dieu-chinh/page}.tsx`, `apps/web/src/app/(public)/give/hoc-bong/page.tsx`, `apps/web/src/app/(member)/toi/hoc-bong/page.tsx`, `apps/web/src/app/admin/give/hoc-bong/page.tsx`, `tests/integration/{points,scholarship}.test.ts`, `tests/e2e/points.spec.ts`, `supabase/tests/database/points_rls.test.sql`.

**Files sửa:** `commerce.settle_orders()` (earn theo `point_rules`), mọi `place_order`/checkout (tham số `p_points`, gọi `commerce.redeem_points` trong cùng transaction), `commerce.cancel_order`/expire (hoàn điểm `adjust`), `commerce.approve_refund` (adjust âm earn đã ghi), `core.entitlements` (tier), GĐ2 `stay_discount` (ưu tiên lớn nhất giữa Premium và hạng, không cộng dồn, ruling), `learn.enroll_*` (`source=scholarship`), `give` expense (học bổng ghi `scholarship_expense`), `crm.customer_timeline` (điểm tổng, không chi tiết), `core.role_permissions` (`points.adjust` aal2).

**Interfaces:**
- Produces: `pointsFor(kind, paidVnd: bigint, rules): number` (1 điểm/10.000 đ làm tròn xuống); `maxRedeem(subtotalVnd, capBp, balance): number` (bội số 100 điểm); `pickExpiring(lots, points): {lotId, points}[]` FIFO theo `expires_at`; `tierFor(points12m, tiers): Tier`.
- RPC: `commerce.points_quote(p_order_subtotal) -> PointsQuote`, `commerce.redeem_points(p_order, p_points)` (lock customer, `POINTS_INSUFFICIENT`, `POINTS_CAP_EXCEEDED`, không cho `donation|subscription`), `commerce.restore_points(p_order)`, `commerce.my_points_ledger()`, `commerce.adjust_points(p_user, p_points, p_reason)` (aal2), `commerce.recompute_tiers()` (cron), `commerce.my_tier() -> TierView`, `give.apply_scholarship(p_target_type, p_target, p_reason)`, `give.decide_scholarship(p_app, p_decision)` (`give.verify`; approve -> đơn 0 đồng + enrollment/retreat booking `scholarship`, sổ `donation_fund -> scholarship_expense`).

- [ ] Unit: `pointsFor('stay', 1_249_000n)` = 124; `maxRedeem(200_000n, 3000, 1000)` = 600; `pickExpiring` lấy lô hết hạn sớm trước; `tierFor(4_999)` = Nảy mầm, `5_000` = Nở hoa.
- [ ] Integration `points.test.ts`: đơn lưu trú settle -> earn với `expires_at` +24 tháng; đơn khóa, sản phẩm, tư vấn, giờ công GĐ2 -> cùng ví của một user (DoD); Review Focus 4 đầy đủ; hai checkout song song cùng ví 600 điểm mỗi bên với số dư 1.000 -> một thành công; hoàn đơn đã earn -> adjust âm, số dư không âm (về 0 nếu đã tiêu); `recompute_tiers` lên hạng tạo entitlement `tier_bloom` và outbox `tier.changed`; hạng không hạ trong tháng; `points-expire` ghi `expire` và `points.expiring` 30 ngày trước; `adjust_points` không aal2 -> 403.
- [ ] Integration `scholarship.test.ts`: quỹ thiếu tiền -> 409; approve -> enrollment `scholarship`, ledger cân, trang minh bạch GĐ2 thấy dòng `scholarship_expense`.
- [ ] pgTAP: `point_transactions` own select, không insert; `point_rules`/`membership_tiers` public select.
- [ ] Chạy fail; migration (bảng, cột `points_redeemed`, RPC, cron `tiers-recompute`, runtime `points.redeem_cap_bp` 3000, fixture rules và 4 hạng theo CLAUDE.md, outbox kinds).
- [ ] UI: W-46 ví (số dư, quy đổi, sắp hết hạn, sổ, cách tích, hạng và quyền lợi), ô "dùng điểm" trong mọi checkout (bội 100, hiện giá trị), admin quy tắc/hạng/điều chỉnh aal2, học bổng public/own/admin.
- [ ] E2E `points.spec.ts`: member có điểm từ 3 nguồn thấy một ví; dùng 300 điểm khi mua hàng -> giảm 30.000 đ; hủy trước thanh toán -> điểm về.
- [ ] Commit `feat: add shared points wallet with redemption, tiers and scholarships`.

**Done:** điểm ba trụ cột trong một ví; đổi điểm an toàn với cap và FIFO; hạng tính đêm và không hạ giữa kỳ; học bổng minh bạch qua sổ.

## T41. Đa điểm và farmstay, lô sản xuất và tem

**Phụ thuộc:** T36 (song song T40). **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202708160002_locations_lots.sql`, `packages/core/src/shop/{lot-status,lot-status.test}.ts`, `packages/core/src/core/{location-clone,location-clone.test}.ts`, `packages/api/src/{lots,locations}.ts`, `apps/web/src/app/(public)/lo/[code]/page.tsx`, `apps/web/src/features/lots/{lot-journey,bovis-gauge,disclaimer}.tsx`, `apps/web/src/app/admin/kho/lo/{page,[id]/page,[id]/tem/route.ts}.tsx`, `apps/web/src/app/admin/he-thong/diem-ban/{page,moi/page,[id]/page}.tsx`, `apps/web/src/features/locations/{create-wizard,compare-table}.tsx`, `tests/integration/{lots,locations}.test.ts`, `tests/e2e/lot-stamp.spec.ts`, `supabase/tests/database/{lots_rls,locations_rls}.test.sql`.

**Files sửa:** `core.locations` (cột `kind`, `parent_location_id`), `/stay/[location]` và `/space` (theo `kind`, farmstay hiện `farm_activities`), `shop.place_order`/`hold_stock` (`LOT_HELD`), `/shop/[slug]` (lô đang bán + link), dashboard admin GĐ0-GĐ2 (bộ chọn "hợp nhất entity", so sánh điểm), `check-rls`, `seed` (L3 farmstay test), `lib/seo/public-routes.ts` (`/lo/*`), `sitemap`, `core.role_permissions` (`location.manage` aal2, `lot.manage`).

**Interfaces:**
- Produces: `lotStatusAllowed(current, next, bovisFinal): boolean` (on_sale cần ≥ 9000); `cloneLocationConfig(source): LocationInput` (policy, dịch vụ, mẫu thông báo, giờ; không phòng, không nhân sự).
- RPC: `core.create_location(p_payload, p_clone_from)` (aal2 super_admin, `status=draft`), `core.update_location(...)`, `core.location_report(p_entity, p_from, p_to) -> rows theo location` + `consolidated`, `shop.upsert_lot(p_payload)` (`BOVIS_BELOW_THRESHOLD` cảnh báo trả về, không chặn lưu), `shop.set_lot_status(p_lot, p_status)` (`lot.manage`; `on_sale` với Bovis < 9000 -> 422), `shop.attach_lot(p_variant, p_lot, p_qty)`, `shop.lot_public(p_token) -> LotPublic`, `shop.lot_stamp_pdf(p_lot, p_count)` (pdf-lib, QR SVG GĐ0, lưới 3x8, bucket `stamps`).

- [ ] Unit: `lotStatusAllowed('held','on_sale',8600)` false, `9000` true; `cloneLocationConfig` không mang `rooms` và `staff`.
- [ ] Integration `lots.test.ts`: tạo lô 8.600 -> lưu được với cảnh báo, `on_sale` -> 422; lô 9.400 `on_sale`, gắn biến thể; biến thể chỉ còn lô held -> `hold_stock` `LOT_HELD`; `/lo/<token>` công khai trả hành trình, không có `performed_by` email; token sai -> 404; tem PDF 24 ô có QR tới đúng URL.
- [ ] Integration `locations.test.ts`: tạo L4 farmstay clone từ L1 -> policy và dịch vụ giống, không phòng; `draft` không xuất hiện ở `/space`; `test` không vào `consolidated`; location_manager L1 không thấy báo cáo L4; cafe `parent_location_id=L1` hiện trong trang L1.
- [ ] pgTAP: `production_lots` public select chỉ qua `lot_public` (bảng không public), editor manage; `locations` select public khi `active`.
- [ ] Chạy fail; migration, UI: W-114 mở rộng (wizard 4 bước, loại điểm, clone, Energy Card không gian), W-115 lô (nhập Bovis với gauge và cảnh báo, hành trình, ảnh, trạng thái, in tem), W-34 trang lô với câu miễn trừ cố định, dashboard hợp nhất và so sánh điểm.
- [ ] E2E `lot-stamp.spec.ts`: editor tạo lô, in tem, mở URL từ QR -> trang lô đúng mã; khách mua sản phẩm thấy lô; lô chuyển held -> nút mua tắt.
- [ ] Commit `feat: add multi-location creation with farmstay kind, production lots and energy stamps`.

**Done:** tạo điểm mới không cần migration; báo cáo theo điểm và hợp nhất; lô dưới ngưỡng không bán được; tem dẫn tới trang công khai có miễn trừ.

## T42. Data warehouse: dw views, export BigQuery, đối chiếu, Looker

**Phụ thuộc:** T37-T41 (để view đủ bảng). **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202708300001_dw_views.sql`, `supabase/functions/dw-export/index.ts`, `supabase/functions/_shared/gcp/bigquery.ts`, `dw/bigquery/{schema,rpt_holding,rpt_space,rpt_connect,rpt_give}.sql`, `scripts/{check-dw-columns,bq-apply}.mjs`, `packages/core/src/dw/{watermark,watermark.test,pseudonym,pseudonym.test}.ts`, `apps/web/src/app/admin/he-thong/warehouse/page.tsx`, `tests/integration/dw.test.ts`, `supabase/tests/database/dw_privacy.test.sql`, `docs/runbooks/warehouse.md`, `docs/dw/looker.md`.

**Files sửa:** `check-rls.mjs` (schema `dw`: view owner `dw_exporter`, chạy `check-dw-columns`), `ci.yml` (bước `pnpm check:dw`), `package.json` scripts, `config.toml` (không expose `dw`), `functions/.env.example`, `core.role_permissions` (`dw.manage`), `/status` (dw_runs).

**Interfaces:**
- Produces: `nextWatermark(prev, rows): Date` (max `updated_at` trừ 2 ngày chồng); `userKey(userId, salt): string` (sha256 hex, test vector cố định).
- RPC: `dw.run_log(p_view, p_state, p_rows, p_watermark, p_error)` (service role), `dw.daily_totals(p_date) -> {orders, paidVnd, enrollments, bookings}` (cho reconcile), `dw.rerun(p_view)` (`dw.manage`, đặt watermark lùi 7 ngày).
- Edge `dw-export`: `POST /run` (cron, tuần tự từng view), `POST /reconcile` (so `daily_totals` với BigQuery `SELECT` tương ứng, lệch -> outbox `dw.failed`).

- [ ] Unit: `nextWatermark` chồng 2 ngày; `userKey` deterministic và khác salt khác kết quả.
- [ ] pgTAP `dw_privacy`: mọi view trong `dw` không có cột trong danh sách cấm; `dw.*` không select được bởi `authenticated`/`anon`; `user_key` không bằng `user_id` ở `orders_v`.
- [ ] Integration `dw.test.ts` (`DW_FAKE=1`, BigQuery giả = bảng Postgres `dw_fake.*` trong schema test): chạy `/run` hai lần -> số dòng không trùng theo khóa; đổi trạng thái một đơn rồi chạy -> dòng cập nhật; `reconcile` khớp; view thiếu quyền -> `dw_runs state=failed` và outbox; `check-dw-columns` fail khi thêm cột `email` vào view (test sửa view tạm trong transaction).
- [ ] Chạy fail; migration: role `dw_exporter`, 16 view mục 1 với `user_key`, `dw_runs`, RPC; Edge `dw-export` với GCS upload + BigQuery load job + MERGE theo `dw/bigquery/schema.sql`; `bq-apply.mjs` áp `rpt_*.sql` (chạy tay có `BQ_PROJECT`); cron `dw-export` 02:00 VN; admin W-132 (dw_runs, đối chiếu, chạy lại, cảnh báo).
- [ ] Looker Studio: 4 trang theo `docs/dw/looker.md` (nguồn, bộ lọc entity/điểm/tháng, chỉ số chuẩn: doanh thu 5 nguồn, công suất, ADR, học viên, GMV, hoa hồng, quyên góp, điểm phát hành); chia sẻ theo email ban điều hành; ảnh chụp lưu `docs/evidence/dw/`.
- [ ] Commit `feat: add pseudonymised dw views with bigquery export and reconciliation`.

**Done:** warehouse chỉ chứa dữ liệu kinh doanh giả danh hóa, cập nhật hằng ngày idempotent, có đối chiếu và cảnh báo; Looker đọc từ `rpt_*`.

## T43. Tải, tối ưu, pentest nhẹ, on-call, CWV, mobile scaffold, UAT, release

**Phụ thuộc:** T36-T42. **Ước lượng:** 7-8 ngày + UAT theo sprint.

**Files tạo:** `tests/load/{public-pages,search,booking-hold,enroll-heartbeat,cart-order}.js`, `tests/load/README.md`, `scripts/{seed-load,build-tokens}.mjs`, `supabase/migrations/202709130001_gd3_perf.sql`, `packages/ui/src/tokens/nativewind.preset.js` (sinh), `apps/mobile/{app.json,package.json,tsconfig.json,app/_layout.tsx,app/index.tsx,app/(tabs)/khoa-hoc.tsx,lib/supabase.ts}`, `packages/config/eslint/no-platform-imports.js`, `packages/api/src/platform.test.ts`, `docs/runbooks/{on-call,load-testing}.md`, `docs/security/{pentest-gd3-checklist,pentest-gd3-report}.md`, `docs/evidence/load/README.md`, `docs/releases/{s15-s16,s17,s18,s19-s20}.md`, `docs/uat/{studio,vendor,affiliate,retreat,points,locations,warehouse}.md`, `tests/e2e/{gd3-flows,security-gd3}.spec.ts`.

**Files sửa:** `tests/performance/public-pages.ts` (INP, trang `/retreat/[slug]`, `/lo/[code]`), dashboard admin (`ops_config.mv_dashboard_daily` refresh 10 phút), index theo kết quả k6, `ci.yml` (job `mobile-typecheck`, `check:tokens`, `check:dw`), `package.json` (workspace `apps/mobile`), `packages/api/*` (gỡ import Next/DOM nếu có), `/status` (cron, Edge, dw), `README.md`, `docs/implementation-rulings.md`, `docs/setup.md` (GCP, k6, Expo).

**Interfaces:**
- `scripts/seed-load.mjs --users 10000 --orders 50000` chỉ khi `SUPABASE_ENV=staging`; `scripts/build-tokens.mjs --check` fail khi preset lệch `zsopo.json`.
- k6 ngưỡng: `http_req_duration{kind:rpc} p(95) < 400`, `{kind:page} p(95) < 600` TTFB, `http_req_failed < 0.005`; 500 VU ramp 2 phút, giữ 10 phút.

- [ ] Lint/test nền tảng: rule `no-platform-imports` cấm `next/*`, `react-dom`, `window` trong `packages/{api,core}`; `platform.test.ts` import toàn bộ `@zsopo/api` trong Node thuần không lỗi.
- [ ] `build-tokens.mjs`: sinh preset NativeWind từ `zsopo.json`, `--check` so với `theme.css` (màu, spacing, radius, font).
- [ ] `apps/mobile`: Expo Router, màn đăng nhập email magic link qua `@supabase/supabase-js` + `expo-secure-store`, tab "Khóa học" gọi `learn.my_courses` qua `@zsopo/api`; chạy simulator; CI `pnpm --filter mobile typecheck`.
- [ ] k6: 5 kịch bản trên staging với seed lớn; ghi kết quả vào `docs/evidence/load/<date>.md`; tối ưu theo bằng chứng (index, mv dashboard, ISR, gộp RPC); chạy lại tới khi đạt ngưỡng.
- [ ] Pentest nhẹ: checklist WSTG rút gọn (auth/session, RLS qua REST từng schema mới, IDOR token khách/`/lo/<token>`/play ticket, upload video và ảnh lô, SSRF Edge `video`/`dw-export`, IPN replay GĐ2, rate limit `/a/[code]` và `/doan`, OTP brute force hợp đồng 5 lần khóa 15 phút); báo cáo và việc sửa; finding cao/trung sửa trước release.
- [ ] E2E `security-gd3.spec.ts`: member A `/play` asset khóa chưa ghi danh -> 403; vendor A đọc đơn vendor B -> rỗng; affiliate self-purchase không gắn; member đọc `health_form_enc` qua REST -> cột không tồn tại; ops_finance A review+approve cùng kỳ -> 403; `dw` qua REST -> 404; OTP sai 6 lần -> khóa.
- [ ] E2E `gd3-flows.spec.ts`: chuyên gia đăng khóa -> duyệt -> bán -> settle -> payout paid; retreat giữ -> cọc -> ký; điểm 3 nguồn -> đổi điểm; lô -> tem -> trang lô; export dw fake -> admin thấy run xanh.
- [ ] Vận hành: on-call (ca tuần, S1-S4, SLA phản hồi 15 phút/1 giờ/1 ngày/tuần, kênh, leo thang), cảnh báo mới (payout quá hạn 10 ngày, dw_runs failed, video failed > 3/ngày, installments overdue), `/status` mở rộng, diễn tập khôi phục quý 3 ghi `docs/evidence`.
- [ ] CWV: INP vào budget, đo 7 trang; sửa handler nặng ở player và editor Studio (không tính Studio vào budget công khai).
- [ ] Tài liệu: release notes S15-S20 tách code xong và gate thực địa (5 khóa duyệt, kỳ payout 7/2027 đóng, retreat bán hết, 20 ví ba nguồn, điểm mới active/test, báo cáo tháng 9 từ Looker), hợp đồng/pháp lý, UAT theo actor, đào tạo chuyên gia/vendor, README thứ tự đọc.
- [ ] Chạy full suite từng lệnh một dòng; `! grep -rE 'sb_secret_|service_role|GCP_SA|CDN_KEY|DW_SALT' apps/web/.next/static`; commit `docs: hand over gd3 revenue and scale release`.

**Done:** p95 đạt ngưỡng có bằng chứng; pentest sạch finding cao/trung; on-call và cảnh báo chạy; `packages/api` chạy trong Node thuần và Expo scaffold typecheck; release notes tách rõ gate người thật.

## 3. Checklist tự rà soát plan

- [ ] Mọi story MUST GĐ3 (LRN-06, video, sự kiện chuyên gia, SHOP-04, EXP-04/payout, MEM-04, EVT-03, MEM-02, STAY-06, ADM-06, tải/pentest/vận hành, mobile prep) có task/RPC/test; SHOULD chọn (STAY-07, SHOP-05, GIV-06, LRN-07 tối thiểu) ghi lý do; EXP-05, GIV-05, STAY-05 ghi hoãn.
- [ ] Không đường chi tiền nào ngoài `payout_periods` hai bước có chứng từ; nghĩa vụ chỉ sinh sau settle; sổ cái mỗi event cân 0 và có test cho settle, payout paid, học bổng, retreat cọc/completed.
- [ ] Dữ liệu nhạy cảm mới (phiếu sức khỏe, tài khoản ngân hàng payee, hợp đồng) mã hóa hoặc bucket private, có log đọc, không vào dw/timeline/CSV khách; `dw` kiểm cột cấm trong CI.
- [ ] Race: hạng phòng retreat cuối, đổi điểm song song, submit khóa khi video chưa ready, payout line vào hai kỳ, export dw chạy chồng.
- [ ] Review Focus 1-5 có test ở T37, T37, T39, T40, T42.
- [ ] Mọi tính năng sau FEATURES flag, mặc định tắt production tới release sprint; `VIDEO_FAKE`/`DW_FAKE` bị `seed-validate --production` từ chối.
- [ ] Release tách test kỹ thuật, staging với dữ liệu lớn, và gate thực địa.
