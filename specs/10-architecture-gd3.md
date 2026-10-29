# Kiến trúc GĐ3: phần bổ sung

Áp dụng `02`, `06`, `08` và rulings. GĐ3 thêm hai thứ mới về bản chất: egress tiền ra ngoài (payout) và hạ tầng GCP (Storage, Transcoder, BigQuery). Payout vẫn là chuyển khoản tay có chứng từ, không gọi API ngân hàng. Mọi secret GCP chỉ ở Edge secrets; Next.js chỉ nhận URL đã ký.

## 1. Schema mới và thay đổi

Schema mới: `dw` (view). Không thêm schema nghiệp vụ; `dw` không vào `config.toml` API (không expose qua PostgREST), có vào `check-rls.mjs` dưới dạng kiểm "view security_invoker và không chọn cột cấm".

| Schema | Bảng mới / thay đổi |
|---|---|
| core | locations thêm `kind` (homestay, cafe, showroom, farmstay, franchise) default homestay, `parent_location_id`; role thêm `vendor`; entitlements dùng thêm `code tier_seed|tier_sprout|tier_bloom|tier_shine` |
| commerce | orders.kind thêm `retreat`; orders thêm `affiliate_id`, `points_redeemed int default 0`, `settled_at`; installments(order_id, seq, amount, due_at, paid_at, state pending|paid|overdue, unique(order_id, seq)); payees(kind expert|vendor|affiliate, ref_id, legal_name, tax_id, bank_account, bank_name, contract_media_id, tax_withholding_bp, status, unique(kind, ref_id)); payout_periods GĐ2 thêm `payee_kind`, `state draft|reviewed|approved|paid|void`, `reviewed_by`, `approved_by`, `paid_at`, `evidence_media_id`, `tax_withheld`, `net_amount`; payout_lines(period_id, ledger_event_id unique, order_id, gross, note); affiliates(user_id unique, code unique, status pending|approved|suspended, payee_id, approved_by); affiliate_clicks(affiliate_id, cookie_id, landing, utm jsonb, ip_hash, created_at); point_rules(order_kind unique, points_per_10k, active); point_transactions.kind dùng đủ `earn|redeem|expire|adjust`; membership_tiers(code, name, min_points_12m, benefits jsonb, position); ledger_entries.account thêm `tax_withheld`, `scholarship_expense`; commission_rules dùng `scope vendor|affiliate` và `item_type product|course|event|stay|consult` |
| learn | courses thêm `owner_expert_id`, `status` thêm `in_review|rejected`, `review jsonb`; course_revisions(course_id, snapshot jsonb, submitted_at, decided_at, decision, checklist jsonb, reviewer_id); video_assets(id, owner_expert_id, course_id, gcs_object, state uploading|processing|ready|failed, duration_s, size_bytes, hls_manifest, job_name, error); lessons.content cho `kind=video` chấp nhận `{provider: youtube|gcs, video_asset_id}`; live_sessions(course_id, title, starts_at, ends_at, provider meet|youtube, url, recording_url, state); video_watch_minutes(course_id, month, minutes) |
| events | events.kind thêm `retreat`; events.status thêm `in_review|rejected`; retreats(event_id unique, itinerary jsonb, room_type_options jsonb, deposit_schedule jsonb, health_form_schema jsonb, contract_template text, prep_checklist jsonb); retreat_bookings(order_id unique, event_id, customer_id, room_type, room_id, pax, health_form_enc bytea, health_form_at, contract_text, contract_hash, contract_signed_at, sign_ip, state held|deposited|confirmed|transferred|cancelled); retreat_access_logs(booking_id, accessed_by, at) |
| stay | room_allocations.kind thêm `retreat`; group_requests(location_id, code unique `B2B-NNNN`, org_name, contact jsonb, pax, date_from, date_to, program, budget_hint, notes, status, quote_media_id, contract_media_id, assigned_to, booking_order_id) |
| shop | vendors(entity_id, user_id unique, name, slug, contract_media_id, commission_rule_id, payee_id, status pending|active|suspended); products thêm `vendor_id`, `status` thêm `in_review`, `pending_changes jsonb`; production_lots; variant_lots(variant_id, lot_id, qty, unique) |
| give | scholarship_funds(fund_id unique, rules jsonb, balance_view); scholarship_applications(user_id, target_type course|retreat, target_id, reason, status pending|approved|rejected, decided_by, granted_order_id) |
| ops_config | dw_runs(view_name, rows, started_at, finished_at, state, error, watermark); runtime_settings thêm `learn.review_checklist`, `points.redeem_cap_bp`, `payout.min_amount`, `payout.tax_threshold`, `video.max_bytes` |
| dw | view `orders_v, order_items_v, payments_v, ledger_v, enrollments_v, lesson_progress_daily_v, events_v, registrations_v, bookings_v, occupancy_daily_v, campaigns_v, donations_v, points_v, locations_v, products_v, consult_summary_v` với `user_key` giả danh, `entity_id`, `location_id`, `updated_at` |

Ràng buộc: `payout_lines.ledger_event_id` unique chặn một nghĩa vụ vào hai kỳ; `payout_periods` check `approved_by <> reviewed_by`; `point_transactions` tổng theo user không âm (check trong RPC `commerce.redeem_points`, lock dòng `core.customers`); `retreat_bookings.room_id` exclusion với `room_allocations` qua cùng cơ chế GĐ0 (gán phòng là một allocation `kind=retreat` con của block retreat); `production_lots` check `status <> 'on_sale' or bovis_final >= 9000`; `installments` tổng = `orders.total` (trigger khi tạo đơn); `affiliates.user_id` không trùng `orders.customer_id` khi gắn (check trong RPC); `dw.*` view `security_invoker = false` thuộc owner `dw_exporter` chỉ có `select` trên cột cho phép, kiểm tự động không có cột trong danh sách cấm (`email, phone, name, full_name, address, answers, notes_enc, health_form_enc, id_doc_media_id`).

## 2. Edge Functions và GCP

| Function | Vai trò | Secrets |
|---|---|---|
| `video` | `POST /upload-url` (JWT expert, kiểm sở hữu khóa, tạo `video_assets uploading`, trả resumable signed URL GCS v4 TTL 1 giờ, giới hạn `video.max_bytes`); `POST /ingest` (sau upload xong: tạo job Transcoder HLS 360p/720p/1080p sang prefix `hls/<asset_id>/`); `POST /callback` (Pub/Sub push có OIDC token xác minh, hoặc cron `video-poll` 1 phút hỏi trạng thái job) đổi `ready|failed`; `POST /play` (JWT member đã ghi danh hoặc chủ khóa hoặc reviewer, trả URL ký CDN prefix `hls/<asset_id>/` TTL 2 giờ) | `GCP_SA_JSON_VIDEO`, `GCS_BUCKET_VIDEO`, `CDN_KEY_NAME/CDN_KEY`, `VIDEO_FAKE` |
| `dw-export` | Cron 02:00 VN: với mỗi view `dw.*` đọc theo `updated_at > watermark - 2 ngày`, ghi NDJSON gzip lên `gs://<bucket>/dw/<view>/<date>.ndjson.gz`, tạo load job BigQuery vào bảng staging rồi `MERGE` vào bảng chính; ghi `dw_runs`; `POST /reconcile` so số dòng và tổng tiền ngày trước | `GCP_SA_JSON_DW`, `GCS_BUCKET_DW`, `BQ_PROJECT`, `BQ_DATASET=zsopo_dw`, `DW_SALT`, `DW_FAKE` |
| `payouts-export` | Sinh CSV kỳ payout (dòng theo payee với số tài khoản) vào bucket private `finance` cho kế toán tải; chỉ `payout.review` | service role |
| `meet` (GĐ2) | Dùng lại cho `live_sessions provider=meet` | như GĐ2 |
| `account-delete` (GĐ1) | Mở rộng xóa `retreat_bookings.health_form_enc`, `affiliate` PII, giữ `payout` lịch sử theo nghĩa vụ kế toán (giả danh hóa `legal_name`) | |

GCP: một project `zsopo-prod` và một `zsopo-staging`; bucket video private với Cloud CDN và signed URL key; Transcoder API bật; BigQuery dataset `zsopo_dw` partition theo `_date`, hạn mức truy vấn 1 TB/ngày; service account riêng cho video và dw, không cấp quyền chéo. `VIDEO_FAKE=1` và `DW_FAKE=1` cho local và CI: video lưu ở bucket Supabase `video-dev` và "ready" sau 5 giây, dw ghi NDJSON vào bucket Supabase `dw-dev` và bỏ qua BigQuery.

## 3. Quyền

| Action | editor | ops_finance | location_manager | super_admin | expert/vendor (own) |
|---|---|---|---|---|---|
| course.review, event.review, lot.manage | x | | | x | |
| vendor.manage, affiliate.manage, payout.review, b2b.manage, retreat.manage, dw.manage | | x | b2b/retreat tại điểm mình | x | |
| payout.approve, points.adjust | | aal2 | | aal2 | |
| location.manage | | | | aal2 | |
| retreat.checkin, retreat.health_read | | | x tại điểm (health chỉ người dẫn được gán) | aal2 | |
| Studio own (khóa, sự kiện, live, video upload, payout của mình) | | | | | RLS own + RPC kiểm `owner_expert_id` |
| Vendor own (sản phẩm, tồn, đơn có hàng mình, payout của mình) | | | | | RLS own qua `shop.vendors.user_id` |
| Affiliate own | | | | | RLS own qua `affiliates.user_id` |

Member: `commerce.redeem_points` chỉ cho chính mình trong `place_order`; đọc `point_transactions` own; `scholarship_applications` own; `retreat_bookings` own không đọc được `health_form_enc` qua REST (cột bị loại khỏi view `retreat_bookings_me`).

## 4. Contracts và wrapper

`packages/core/src/contracts`: `CourseReview {checklist: {key, pass, note}[], decision}`, `VideoAsset {id, state, durationS, hlsManifest?}`, `UploadTicket {assetId, uploadUrl, expiresAt}`, `PlayTicket {manifestUrl, expiresAt}`, `LiveSession`, `VendorProductInput`, `PayoutPeriodView {id, payeeKind, period, gross, taxWithheld, net, state, lines[]}`, `AffiliateStats {clicks, orders, pending, available, paid}`, `RetreatInput`, `RetreatBookingInput {eventId, roomType, pax}`, `HealthForm` (chỉ tồn tại ở client và RPC mã hóa, không log), `ContractSign {bookingId, otp}`, `GroupRequestInput`, `PointsQuote {available, maxRedeem, valueVnd}`, `TierView {code, name, points12m, nextCode, pointsToNext, benefits}`, `LotInput`, `LotPublic`, `LocationInput`, `DwRun`.

Mã lỗi mới: `VIDEO_NOT_READY` (409), `REVIEW_REQUIRED` (409), `REVIEW_CHECKLIST_INCOMPLETE` (422), `PAYOUT_BELOW_MIN` (409), `PAYOUT_SAME_APPROVER` (403), `PAYEE_MISSING` (428), `POINTS_INSUFFICIENT` (409), `POINTS_CAP_EXCEEDED` (422), `INSTALLMENT_OVERDUE` (409), `HEALTH_FORM_REQUIRED` (428), `CONTRACT_NOT_SIGNED` (409), `OTP_INVALID` (401), `LOT_HELD` (409), `BOVIS_BELOW_THRESHOLD` (422), `AFFILIATE_SELF_PURCHASE` (422), `LOCATION_NOT_SELLABLE` (409).

Wrapper `packages/api/src/{studio,vendor,payouts,affiliate,retreat,b2b,points,lots,locations,dw}.ts`, không import Next hay DOM. Edge gọi từ Next qua `fetch` với JWT người dùng, không service role.

## 5. Sổ cái và tiền

| Sự kiện | Giảm | Tăng |
|---|---|---|
| Đơn khóa/vé/hàng vendor `settled` (qua cửa sổ hoàn) | revenue_* (phần chia) | payout_due (counterparty expert|vendor) |
| Đơn có affiliate `settled` | revenue_* hoặc discount theo cấu hình (fixture revenue) | payout_due (affiliate) |
| Kỳ payout `paid` | payout_due, bank | tax_withheld |
| Học bổng cấp | donation_fund | scholarship_expense |
| Retreat đợt 1 paid | gateway_clearing/bank | deposit_liability |
| Retreat `completed` | deposit_liability | revenue_event (và payout_due nếu người dẫn là chuyên gia có hợp đồng) |
| Điểm earn/redeem | không bút toán; `points_outstanding` view | |

`orders.settled_at` do cron `orders-settle` mỗi giờ đặt khi `paid|completed` và qua cửa sổ hoàn của `policy_snapshot`; mọi bút toán chia sẻ và điểm earn chạy ở thời điểm này. GĐ2 ghi `payout_due` lúc paid cho consult: giữ cho consult (hoàn trước buổi đã hủy đơn), chuyển course/event/product sang `settled`.

## 6. Cron, outbox, Storage

pg_cron mới: `orders-settle` mỗi giờ; `payout-draft` 01:00 ngày 1 hằng tháng; `tiers-recompute` 03:00 hằng ngày; `retreat-health-purge` hằng ngày (xóa `health_form_enc` 30 ngày sau `ends_at`); `installments-remind` hằng ngày (nhắc 7 và 3 ngày trước hạn, đánh `overdue`); `video-poll` 1 phút khi có job `processing` (chỉ khi không dùng Pub/Sub); `dw-export` 02:00; `live-reminders` 5 phút; `affiliate-clicks-purge` hằng ngày (click > 90 ngày).

Outbox kinds: `course.submitted`, `course.decided`, `event.submitted`, `event.decided`, `product.submitted`, `product.decided`, `video.ready`, `video.failed`, `live.reminder`, `payout.drafted`, `payout.approved`, `payout.paid` (kèm CSV dòng của payee), `affiliate.approved`, `affiliate.order_settled`, `retreat.held`, `retreat.deposit_received`, `retreat.installment_due`, `retreat.health_reminder`, `retreat.contract_otp`, `retreat.transfer_confirm`, `retreat.prep` (7 ngày trước), `b2b.received`, `b2b.quoted`, `points.earned`, `points.expiring` (30 ngày trước), `tier.changed`, `scholarship.decided`, `lot.held` (cho editor), `dw.failed` (cho dw.manage).

Storage buckets mới: `video-dev` (chỉ local/CI), `dw-dev` (local/CI), `finance` (private: CSV payout, chứng từ chuyển khoản), `stamps` (PDF tem, private, link ký). Video production không ở Supabase Storage.

## 7. Route

| Khu vực | Route |
|---|---|
| Studio (expert) | `/studio/khoa-hoc`, `/studio/khoa-hoc/moi`, `/studio/khoa-hoc/[id]` (soạn, chương/bài, video, giá, gửi duyệt), `/studio/khoa-hoc/[id]/hoc-vien`, `/studio/khoa-hoc/[id]/live`, `/studio/su-kien`, `/studio/su-kien/[id]`, `/studio/doanh-thu` (sổ cái, kỳ payout, xuất CSV), `/studio/tai-khoan-nhan-tien` |
| Vendor | `/vendor`, `/vendor/san-pham`, `/vendor/san-pham/[id]`, `/vendor/ton-kho`, `/vendor/don-hang`, `/vendor/doanh-thu`, `/vendor/hop-dong` |
| Affiliate | `/toi/affiliate` (đăng ký, dashboard, rút), `/a/[code]` (ghi click, đặt cookie, redirect) |
| Learn | `/learn/[slug]/live`, player video GĐ1 nhận `PlayTicket` |
| Retreat | `/retreat`, `/retreat/[slug]`, `/retreat/[slug]/dat` (5 bước: hạng phòng, thông tin, cọc đợt 1, phiếu sức khỏe, hợp đồng), `/toi/retreat/[code]` (chuẩn bị, checklist, đợt tiếp, chuyển nhượng) |
| B2B | `/doan` (W-25), `/doan/da-nhan/[code]` |
| Điểm | `/toi/diem` (W-46), checkout mọi loại đơn có ô "dùng điểm" |
| Học bổng | `/give/hoc-bong`, `/toi/hoc-bong` |
| Lô | `/lo/[code]` (public, noindex không, có SEO cơ bản), `/shop/[slug]` hiện lô đang bán |
| Điểm bán | `/stay/[location]` mở rộng theo `kind`; `/space` liệt kê theo loại |
| Admin | `/admin/khoa-hoc/duyet`, `/admin/su-kien/duyet`, `/admin/kho/vendor`, `/admin/kho/lo`, `/admin/kho/lo/[id]/tem`, `/admin/payout`, `/admin/payout/[id]`, `/admin/affiliate`, `/admin/retreat`, `/admin/retreat/[id]` (phiếu sức khỏe có log), `/admin/doan`, `/admin/diem` (quy tắc, hạng, điều chỉnh), `/admin/give/hoc-bong`, `/admin/he-thong/diem-ban` (W-114 mở rộng, tạo điểm), `/admin/he-thong/warehouse` (W-132: dw_runs, đối chiếu, chạy lại) |
| Ops | `/ops/retreat/check-in`, `/ops/doan` |

FEATURES thêm: `studio_courses`, `vendor_portal`, `affiliate`, `retreat`, `b2b_requests`, `points_redeem`, `tiers`, `scholarship`, `lots`, `multi_location`, `dw_export`, `live_sessions`. Mặc định tắt trên production tới khi release sprint tương ứng.

## 8. Mobile và hiệu năng

- `apps/mobile`: Expo SDK ổn định ≥ 2 tuần tại thời điểm S19, Expo Router, NativeWind, `@supabase/supabase-js` với `expo-secure-store`, dùng `@zsopo/api` và `@zsopo/core`; chỉ màn đăng nhập email magic link, `/toi/khoa-hoc` danh sách, tab trống. `pnpm --filter mobile typecheck` trong CI. Không thêm react-query (GĐ4 quyết định).
- Token: `scripts/build-tokens.mjs` đọc `packages/ui/src/tokens/zsopo.json` sinh `packages/ui/src/tokens/nativewind.preset.js` (màu, spacing, radius, font) và kiểm `theme.css` cùng nguồn (fail nếu lệch).
- Tải: `tests/load/*.js` k6 (binary cài trong CI job riêng, chạy tay trên staging, không trong PR); `scripts/seed-load.mjs` sinh dữ liệu lớn chỉ cho staging (`seed-validate --production` từ chối). Dashboard admin chuyển sang materialized view `ops_config.mv_dashboard_daily` refresh 10 phút.
- Core Web Vitals: thêm INP vào `tests/performance/public-pages.ts` (ngưỡng 200 ms) và trang `/retreat/[slug]`, `/lo/[code]` vào danh sách đo.

## 9. Hoãn sang GĐ4/GĐ5

API ngân hàng chi trả tự động; franchise multi-tenant; B2B portal tự phục vụ; gian hàng tâm thức; gói quảng bá cấu hình; chat trực tiếp; app mobile thật, push; dbt và semantic layer (GĐ3 chỉ view SQL trong repo `dw/bigquery/*.sql`); AI gợi ý; Pub/Sub nếu cron poll đủ (quyết định khi implement).
