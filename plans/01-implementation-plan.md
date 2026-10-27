# ZSOPO GĐ0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ dùng subagent-driven-development nếu người dùng cho phép cách thực hiện đó.

**Goal:** Tạo codebase Next.js/Supabase hiện hành và phát hành toàn bộ 14 story MUST GĐ0 cho Đà Lạt, bám PRD và prototype.

**Architecture:** Một Next.js App Router trong monorepo pnpm/Turborepo; Supabase Postgres/Auth/Storage/Realtime/Edge. Domain TS dùng chung, giao dịch có ràng buộc DB, service role chỉ ở Edge. Public SSR/ISR, Ops PWA có queue tối thiểu, Admin cùng ứng dụng.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase SSR, Zod, React Hook Form, TanStack Query khi cần tương tác, next-intl, Dexie, Vitest, pgTAP, Playwright. Phiên bản kiểm tra ở `../research/02-stack-research.md`.

**Spec:** `../specs/01-product-gd0.md`, `../specs/02-architecture.md`, `../specs/03-prototype-map.md`, `../specs/04-seo-quality.md`.

## Global Constraints

- Chọn stable mới nhất có peer compatibility ở lúc scaffold, pin exact và lockfile; không dùng canary/RC.
- Service role/secret elevated chỉ Supabase Edge Function; không có trong Next.js/browser/preview bundle.
- Tiền nguyên VND; JSON transport là chuỗi decimal nguyên; timezone Asia/Ho_Chi_Minh.
- RLS trên mọi bảng nghiệp vụ; quyền theo action + entity + location, kiểm tra cả RPC/Storage/Realtime.
- Một allocation chung chống trùng booking, OTA, bảo trì; idempotency cho money/stock/queue/outbox.
- GĐ0 một điểm, 13 phòng, chỉ 9 phòng bán; không phát hành module GĐ1-GĐ5 chỉ vì prototype có.
- Ngôn ngữ giao diện tiếng Việt có dấu; không em dash/en dash trong copy mới; không lời hứa y khoa; không số liệu demo trên production.
- Các đường dẫn trong task tương đối với `prod/`. Task nêu file mới cần tạo, không khẳng định file đã tồn tại.
- `prepare` chỉ đọc. Không sao chép runtime canvas vào sản phẩm. Copy assets/tokens có chọn lọc, giữ provenance.
- Mỗi task hoàn thành thành một PR/commit độc lập sau test; không commit secret hoặc dữ liệu thật. Chỉ tạo Git repository trong prod khi bắt đầu implementation và theo môi trường bàn giao.

## 1. Sprint, phụ thuộc và năng lực

| Sprint PRD | Task | Deliverable phát hành | Gate thực địa |
|---|---|---|---|
| S0 03-14/11/2026 | T01-T04, schema nền T05/T06/T13 | Monorepo, env, CI, core/RLS/auth, DS, public shell và chính sách tối thiểu | Setup tái lập, staging xanh, 13/9 seed |
| S1 17-28/11 | T05-T08, phần prebook T09 | Phòng/quote/hold/cọc/receipt/notifications/iCal | 3 booking thật trước 30/11 |
| S2 01-12/12 | T09-T12 | Dịch vụ, Ops, SOP, giấy tờ, offline | Dùng PWA 1 tuần, checklist ≥90% ca |
| S3 15-28/12 | T13-T19 | Shop, CMS, CRM, 5 nguồn, SEO/LLMO, hardening | 20 SKU, đơn đầu, chất lượng + restore |

Critical path: T01 -> T02 -> T03 -> T05 -> T06 -> T07 -> T08 -> T10 -> T11 -> T12 -> T19. T04 mở public UI; T09 phụ thuộc T05/T07; T13 -> T15; T14 -> T16; T06/T09/T15 -> T17; T04/T05/T13/T14 -> T18. T18 kiểm từ sớm, không chờ cuối mới sửa SEO. T19 có gate ở mọi sprint, đợt cuối chỉ gom bằng chứng.

Ước lượng sơ bộ: 60-78 engineer-days + 8-12 ngày UAT/content/ops có thể chồng lịch, chưa gồm thời gian chờ nhà cung cấp. Khoảng 8 tuần GĐ0 với một CTO có rủi ro cao như PRD cảnh báo. Khuyến nghị bổ sung dev/QA hoặc điều chỉnh ngày nếu burn-down chứng minh thiếu năng lực; giữ đầy đủ MUST, giảm phần trang trí/SHOULD trước. Không coi số task là số ngày.

## 2. Quy ước chạy test

T01 tạo các script root: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:db`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `pnpm check:rls`, `pnpm check:types`, `pnpm check:seed`. `test:unit` chạy Vitest packages/core; `test:integration` chạy Vitest integration với Supabase local; `test:db` chạy `supabase test db`; `test:e2e` chạy Playwright.

Snippet test dưới đây là contract test cần viết trong file được chỉ định. Helper DB/API trong `tests/integration/helpers.ts` tạo hai entity, hai location cùng entity, người dùng từng role, clock fixture, seed room/SKU, gọi RPC bằng JWT thật; không mock cơ chế lock/RLS. UI tests dùng accessible role/label và `data-testid` chỉ khi bảng/chart cần định danh.

Mỗi chu kỳ: viết test hành vi -> chạy thấy lỗi đúng nguyên nhân -> implement nhỏ -> chạy lại test liên quan -> inspect diff/commit. Setup thuần cấu hình kiểm build/smoke thay vì test mô phỏng cấu hình. Không báo pass nếu chưa chạy.

## T01. Workspace, version lock, CI và môi trường

**Phụ thuộc:** không. **Ước lượng:** 3-4 ngày.

**Files tạo:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.gitignore`, `.env.example`, `apps/web/package.json`, `apps/web/src/app/{layout,page,error,not-found}.tsx`, `packages/{core,api,db,ui,config}/package.json`, `packages/config/{tsconfig.base.json,eslint.config.mjs}`, `.github/workflows/{ci,deploy}.yml`, `tests/e2e/smoke.spec.ts`, `docs/setup.md`.

**Interface:** tạo workspace scripts mục 2 và package exports `@zsopo/core`, `@zsopo/api`, `@zsopo/db`, `@zsopo/ui`. Env public URL/key, SITE_URL validate lúc boot; app không cần secret elevated.

- [ ] Kiểm lại registry/engines/peer deps theo research, chọn Node LTS hỗ trợ, lưu output `docs/dependency-baseline.json`; pin `packageManager` và Node patch. Không scaffold đè các thư mục tài liệu hiện có.
- [ ] Khởi tạo Next dưới `apps/web`, so hướng dẫn with-supabase để cấu hình SSR, không tạo hai app trùng:

```bash
pnpm dlx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --use-pnpm --import-alias '@/*'
pnpm --dir apps/web dlx shadcn@latest init
```

- [ ] Chuyển dependencies được sinh sang exact version, thiết lập workspace/ui aliases, TS strict; root `.npmrc` dùng `save-exact=true`. Thêm Supabase CLI local dev dependency, setup Docker local ở T02.
- [ ] Viết smoke `expect(await page.title()).toContain('ZSOPO')`, load trang rồi kiểm không hydration error; chạy lint/typecheck/build. Cấu hình CI install `--frozen-lockfile`, lint/typecheck/unit/db/build/e2e và generated types drift.
- [ ] Tạo local/staging env example không secret, Vercel preview/staging settings thành checklist triển khai; production provisioning chỉ khi có tài khoản/tên miền đúng. Gắn Sentry/PostHog theo consent/redaction từ spec.
- [ ] Kiểm clone/setup lại trong thư mục sạch; không có service key trong `.next/static`; commit `chore: bootstrap zsopo workspace`.

**Done:** build/smoke chạy, lockfile có thể tái lập, setup README có lệnh thật, env thiếu báo lỗi dễ hiểu. Chưa coi production đã provision khi chỉ có config.

## T02. Schema lõi, migration, fixture và RLS harness

**Phụ thuộc:** T01. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/config.toml`, `supabase/migrations/202611030001_core.sql`, `202611030002_commerce.sql`, `202611030003_stay_shop_base.sql`, `supabase/seed.sql`, `supabase/tests/database/{schema,roles,rls_base}.test.sql`, `packages/db/src/database.types.ts`, `packages/db/fixtures/{locations,rooms,products}.json`, `tests/integration/helpers.ts`, `scripts/{check-rls,seed-validate}.mjs`.

**Interface:** tables core/commerce/stay/shop từ schema spec, `auth_has_role(role,entity,location)`; helpers `seedTenant`, `clientFor`, `seedRoom`, `seedSku` chỉ test. Định nghĩa Money/result/contracts ở `packages/core/src/contracts/index.ts`.

- [ ] Viết pgTAP cho anon không đọc contact, staff khác điểm không đọc bookings, authenticated không insert ledger, entity mismatch FK bị chặn. Ví dụ assert permissions:

```sql
begin;
select plan(2);
set local role anon;
select is((select count(*)::int from core.customers), 0, 'anon cannot read customers');
select throws_ok($$insert into commerce.ledger_entries default values$$,
  '42501', null, 'anon cannot write ledger');
select * from finish();
rollback;
```

- [ ] Chạy `pnpm test:db`, xác nhận lỗi chưa có schema/policy trước triển khai; tạo migrations có FK/check/index/revoke/grant/RLS, role helper fixed search_path, auditing redacted.
- [ ] Seed Đà Lạt 13/9, 2 kho, role fixtures riêng 2 entity/2 locations; chỉ dữ liệu giả. Seed schemas và constraints nền trong S0, UI shop ở S3.
- [ ] `pnpm exec supabase db reset`, sinh types `pnpm exec supabase gen types typescript --local > packages/db/src/database.types.ts`; chạy pgTAP/RLS inventory/seed validation.
- [ ] Commit `feat: add tenant-safe core commerce and stay schema`.

**Done:** không exposed table thiếu RLS, restore local tái lập, generated types không drift, fixtures không có secret/PII thật.

## T03. Auth, phân quyền và audit UI

**Phụ thuộc:** T02. **Ước lượng:** 3-4 ngày.

**Files tạo:** `apps/web/src/lib/supabase/{browser,server,proxy}.ts`, `apps/web/src/proxy.ts`, `apps/web/src/lib/auth/require-permission.ts`, `apps/web/src/app/(auth)/dang-nhap/page.tsx`, `quen-mat-khau/page.tsx`, `dat-lai-mat-khau/page.tsx`, `auth/callback/route.ts`, `auth/mfa/page.tsx`, `apps/web/src/app/admin/nhan-su/page.tsx`, `supabase/functions/staff-admin/index.ts`, `supabase/tests/database/staff_permissions.test.sql`, `tests/e2e/auth.spec.ts`.

**Interface:** `requirePermission(action, entityId, locationId?)` trả actor đã xác minh; SQL permission dựa roles current; Edge staff-admin invite/disable/grant có audit và aal2.

- [ ] Viết E2E email login/reset, callback redirect external bị từ chối, ops login đúng scope; test thu hồi role bằng admin rồi dùng JWT cũ vẫn bị 403 ở RPC.
- [ ] Chạy `pnpm test:e2e auth.spec.ts` và `pnpm test:db` thấy fail theo thiếu route/policy.
- [ ] Implement SSR clients theo official guide, cookie refresh, email/Google provider config; login copy `authPhase=email`; MFA challenge gate cả server và DB. Member account cơ bản dùng guest claim đã xác minh.
- [ ] Implement staff management, editor scope, manager không tự cấp super_admin, no-store/error pages. Log before/after đã redact, invite token không log.
- [ ] Chạy auth tests + pgTAP + production build; commit `feat: add scoped staff authentication and audit`.

**Done:** kiểm trực tiếp URL/API không vượt quyền; disable có hiệu lực ngay; Google chưa credential được báo disabled, không có nút thành công giả.

## T04. Design system, public shell và chính sách trước thu dữ liệu

**Phụ thuộc:** T01-T03. **Ước lượng:** 2-3 ngày.

**Files tạo:** `supabase/migrations/202611030004_public_content.sql` (pages/policy/media tối thiểu cho release S1), `packages/ui/src/tokens/zsopo.json`, `packages/ui/src/theme.css`, `packages/ui/src/components/{site-header,site-footer,energy-card,price,status-badge}.tsx`, shadcn primitives cần thiết, `apps/web/src/app/(public)/{page.tsx,gioi-thieu/page.tsx,lien-he/page.tsx,chinh-sach/[slug]/page.tsx}`, `apps/web/messages/vi.json`, `tests/e2e/public-shell.spec.ts`.

**Interface:** `EnergyCard` nhận dữ liệu public typed từ core, `Price` nhận Money; header facade/active/feature flags; policy renderer dùng published version, ban đầu seed ở content schema tối thiểu.

- [ ] Đối chiếu JSON tokens/DS/header/logo/ảnh; copy selected assets có provenance. Chụp reference các template cần so tại viewport 390/834/1440.
- [ ] Test keyboard header/mobile sheet, theme persistence, không có CTA module tắt; semantic headings và ảnh alt. Chạy fail trước component.
- [ ] Map Tailwind 4 `@theme inline` tới CSS vars light/dark; shadcn UI giữ brand; reduced motion/hit target; next-intl vi không đổi public URL thành `/vi`.
- [ ] Render trang chủ và chính sách tối thiểu bằng CMS model; dữ liệu chưa duyệt gắn draft local, production không thu data khi thiếu policy published. Không chờ S3 để có privacy/terms.
- [ ] Test visual/a11y/build; commit `feat: establish zsopo design system and public shell`.

**Done:** đủ template nền, responsive thật, không runtime DCLogic, không hard-coded giả số người dùng/số tiền.

## T05. Phòng, Energy Card, pricing và lịch dùng chung

**Phụ thuộc:** T02,T04. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202611170001_stay_allocations.sql`, `packages/core/src/pricing/{quote,quote.test}.ts`, `packages/api/src/stay.ts`, `apps/web/src/features/stay/{queries,actions}.ts`, `apps/web/src/app/(public)/stay/da-lat/phong/[slug]/page.tsx`, `apps/web/src/app/admin/diem/da-lat/page.tsx`, `tests/integration/stay-concurrency.test.ts`.

**Interface:** `quoteStay(StaySelection): DomainResult<Quote>`; SQL quote_stay/create_stay_hold contracts từ spec. Admin rates/services/location settings versioned.

- [ ] Viết unit 2 đêm thường/lễ, phụ thu, trẻ em, 30% ceil, service discount, invalid date/capacity; parity TS/SQL. Integration hai request tranh phòng:

```ts
const results = await Promise.all([reserveSameRoom('request-a'), reserveSameRoom('request-b')]);
expect(results.filter(x => x.ok)).toHaveLength(1);
expect(results.filter(x => !x.ok).map(x => x.error.code)).toEqual(['SOLD_OUT']);
```

`reserveSameRoom` helper tạo quote server và gọi create_stay_hold trên cùng fixture dates bằng hai guest sessions.

- [ ] Chạy `pnpm test:unit` và `pnpm test:integration stay-concurrency`; xác nhận fail; tạo allocation exclusion + room lock + expire-held trong RPC.
- [ ] Implement price/rate precedence, version/policy snapshot, 13/9 sellable; admin room/photo/energy/rate/calendar block. Tạo listing/detail/availability dùng server read model, không share cache user data.
- [ ] Test overlap OTA/bảo trì/booking dùng allocation, adjoining stay và late checkout; không active allocation ở phòng unsellable.
- [ ] Chạy unit/db/integration; commit `feat: add room catalog pricing and atomic availability`.

**Done:** phòng cuối không double-book dù nguồn khác, quote có breakdown và policy, product public page đọc được không JS.

## T06. Payments, VietQR, ledger và guest capability

**Phụ thuộc:** T03,T05. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202611170002_payments.sql`, `supabase/functions/{guest-commerce,payments}/index.ts`, `supabase/functions/_shared/{permissions,idempotency,guest-token}.ts`, `packages/core/src/commerce/{payment,state-machine}.ts`, `apps/web/src/app/api/guest/route.ts`, `apps/web/src/app/admin/thanh-toan/page.tsx`, `tests/integration/payments.test.ts`, `supabase/tests/database/payments_rls.test.sql`.

**Interface:** createStayHold/recordPayment/getGuestReceipt theo spec; `record_payment_atomic` chỉ Edge service entry gọi sau xác minh; guest token hash scope.

- [ ] Viết test cùng `provider_ref` replay 3 lần tạo một payment/event; amount changed với key cũ trả conflict; “đã chuyển khoản” không confirm. Thêm partial/over/late-paid, revoked guest token và đoán mã đơn.

```ts
await recordSameReceiptTwice();
expect(await countPaymentEffects()).toEqual({payments:1, ledgerEvents:1, confirmations:1});
```

Helper chỉ đếm event group (một event có thể nhiều ledger lines).

- [ ] Chạy integration/pgTAP fail trước RPC; implement atomic payment allocation, append-only ledger, pending review/refund evidence, không ghi thẳng từ browser.
- [ ] VietQR renderer dùng cấu hình ngân hàng đã duyệt, không gắn mã mẫu cố định. Manual staff entry kiểm quyền/lý do/evidence; provider webhook adapter disabled cho tới có provider contract/credentials và signature test.
- [ ] Guest access exchange token -> HttpOnly cookie, no-store/noindex, CSRF/origin/rate limiting; ownership claim xác minh email, shop phone-only không tự cấp access mới chỉ dựa phone.
- [ ] Run duplicate/concurrency/rollback/late-payer tests; commit `feat: add idempotent payments and private guest receipts`.

**Done:** receipt bảo mật, ledger không sửa/xóa, tiền tới muộn không chiếm phòng người khác, cash/đặt cọc không lẫn revenue.

## T07. Booking UI, outbox và thông báo hành trình

**Phụ thuộc:** T05,T06. **Ước lượng:** 3-4 ngày.

**Files tạo:** `apps/web/src/app/(guest)/dat-phong/page.tsx`, `dat-phong/[code]/{page.tsx,thanh-toan/page.tsx,xac-nhan/page.tsx}`, `apps/web/src/features/stay/components/booking-wizard.tsx`, `supabase/functions/notify/index.ts`, `supabase/functions/maintenance/index.ts`, `apps/web/src/app/(public)/handbook/da-lat/page.tsx`, `tests/e2e/booking.spec.ts`, `tests/integration/outbox.test.ts`.

**Interface:** consumes Quote/Hold/PaymentResult; outbox types booking.confirmed/handbook.due/checkout.thanks; template vars allowlist, provider adapter `send({dedupeKey,to,template,vars})` returns provider id/status.

- [ ] E2E W16-W20: chọn ngày, contact/consent, tạo hold, pending, staff xác nhận, receipt; refresh không tạo order mới. Thử expires, reconnect, changed quote, underpaid.
- [ ] Test outbox retry cùng key, lease expiry, hủy booking bỏ reminder, booking sát giờ gửi handbook ngay; chạy fail.
- [ ] Implement wizard/form validation theo prototype, bỏ coupon/points/online-gateway demo; countdown từ heldUntil/server time. Worker claim/retry/dead-letter, Resend email, Zalo adapter có disabled/failure visible.
- [ ] Template confirmation trong 60 giây target, handbook trước 24h, thanks sau checkout 24h; no sensitive payload in analytics. Quản trị W129 log/mẫu/retry giao dịch.
- [ ] Chạy booking/outbox/SMTP local tests rồi staging provider sandbox nếu có; commit `feat: ship guest booking and transactional notifications`.

**Done:** F1 tới receipt thật, không dựa nút mô phỏng; delivery thất bại có cảnh báo/retry, chưa có Zalo phải ghi release deviation.

## T08. iCal import/export và xử lý conflict

**Phụ thuộc:** T05-T07. **Ước lượng:** 3-4 ngày.

**Files tạo:** `supabase/migrations/202611170003_calendar.sql`, `supabase/functions/{ical-sync,ical-export}/index.ts`, `supabase/functions/_shared/ical.ts`, `apps/web/src/features/stay/components/calendar-feeds.tsx`, `tests/integration/ical.test.ts`, `tests/fixtures/ical/{date,tz,duplicate,cancelled,malformed,overlap}.ics`, `docs/runbooks/ota-sync.md`.

**Interface:** reconcile feed snapshot -> raw calendar_blocks + allocations/conflicts, `job_runs`; export UID prefix `zsopo-`, rotating secret token.

- [ ] Viết fixture DATE DTEND exclusive, timezone, cancel/remove, malformed/timeout, duplicate UID, self-export, bounded recurrence. Assert lỗi fetch không xóa last-good; OTA/direct conflict còn evidence và đóng bán.
- [ ] Chạy integration fail; implement parser pin version, SSRF protection (HTTPS, allowlist nhà cung cấp cấu hình, chặn private IP/redirect đích private, timeout/size limit), fetch/reconcile transaction theo room.
- [ ] Schedule 15 phút; failure >=2 cảnh báo staff; export chỉ busy, không PII, hash token. Admin sync now/retry/rotate; query không chứa import secrets.
- [ ] Run concurrent iCal + hold test, xoay export token cũ 401, source event remove không nhả booking direct; commit `feat: add resilient ota calendar synchronization`.

**Done:** iCal eventual consistency được hiển thị; lỗi feed không làm bán nhầm, conflict có owner/action.

## T09. Dịch vụ đặt trước và QR kỳ lưu trú

**Phụ thuộc:** T05-T07. **Ước lượng:** 2-3 ngày.

**Files tạo:** `supabase/migrations/202612010001_services.sql`, `packages/api/src/services.ts`, `apps/web/src/features/stay/components/prebook-services.tsx`, `apps/web/src/app/(guest)/dich-vu/da-lat/page.tsx`, `apps/web/src/app/ops/dich-vu/page.tsx`, `tests/integration/services.test.ts`, `tests/e2e/room-services.spec.ts`.

**Interface:** requestService contract; service state events + outbox/realtime; `order_item_id` duy nhất cho request.

- [ ] Test biết room code nhưng thiếu stay token không ghi được; duplicate request không ghi hai phí; lead time reject; cancel chỉ trước accepted; checkout revoke.
- [ ] Chạy tests fail; implement 4 groups, unit/lead/discount, admin CRUD, prebook wizard W17, QR request/status theo token.
- [ ] Realtime private channel có location scope; offline guest request giữ draft và thông báo chưa gửi, reconnect xác nhận giờ/giá còn hợp lệ trước submit; không tự gửi món quá hạn.
- [ ] Run e2e guest -> lễ tân accept -> completed -> order items; commit `feat: connect prebook and in-stay services`.

**Done:** item đến đúng booking/entity, phí không tự ghi bằng tên phòng, thông báo realtime có reconnect.

## T10. Lễ tân LT01-LT05 và BM01

**Phụ thuộc:** T06,T08,T09. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202612010002_frontdesk.sql`, `packages/api/src/ops.ts`, `packages/core/src/ops/{cash-shift,cash-shift.test}.ts`, `apps/web/src/app/ops/{ca,phong,dat-phong,tickets}/` route files theo map, `apps/web/src/features/ops/components/{room-board,check-in,check-out,shift-handover}.tsx`, `tests/e2e/frontdesk.spec.ts`, `tests/integration/booking-transitions.test.ts`.

**Interface:** transitionBooking contract; cash formula, `handover_shift(shiftId,expectedVersion,countedCash,receiverId,notes)`; ticket create/assign/close có permission.

- [ ] Test check-in phòng chưa approved bị reject; checkout còn nợ cần manager exception; hai checkout cùng version chỉ một thành công; bank payment không vào cash count.

```ts
expect(closeCash({opening:1000000n,receipts:500000n,expenses:100000n,remitted:200000n})).toBe(1200000n);
```

`closeCash` export pure từ cash-shift.ts, nhận/return bigint.

- [ ] Chạy unit/integration/e2e fail; implement source/manual booking cùng allocation; board ngày/tuần 3 chiều trạng thái; check-in/out transaction + realtime/outbox/task.
- [ ] Ticket BM04 SLA 15 phút, critical escalate ngay, assignment và timeline; BM01 bất biến sau hai người xác nhận, chênh lệch không ép thành 0; chỉnh bằng amendment có audit.
- [ ] In/export BM01, operational receipt không gọi hóa đơn VAT; hướng dẫn chuyển phần mềm kế toán ngoài. Run LT workflow và privileges; commit `feat: implement front desk sop and cash handover`.

**Done:** đủ LT01-LT05, checkout tạo dirty/task, key/stay token revoke, tiền và ca đối chiếu được.

## T11. Buồng phòng, BM02-BM04, vật tư và giấy tờ

**Phụ thuộc:** T10. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202612010003_housekeeping.sql`, `202612010004_private_documents.sql`, `apps/web/src/app/ops/{buong-phong,nghiem-thu,lich-don,vat-tu,su-co,do-that-lac,huong-dan}/` route files theo map, `supabase/functions/identity-docs/index.ts`, `supabase/functions/_shared/encryption.ts`, `tests/integration/{housekeeping,identity-retention}.test.ts`, `tests/e2e/housekeeping.spec.ts`.

**Interface:** ChecklistOp/approveInspection, versioned SOP templates, private media classification, encrypted document metadata expiry, stock movement transaction.

- [ ] Test BM02 fail -> BM03 không approve; BP02 DND không vào; BP03 sạch/bẩn reconcile; lost-found returned có xác minh/evidence; identity document expiry xóa file/ref/key và audit không chứa bản rõ.
- [ ] Chạy fail, implement 7 nhóm UI đủ checkpoint DOCX, inspect/rework/ready, maintenance blocks; lịch BP04, BP03 movement/replenishment, BM04 return flow, in biểu mẫu có version.
- [ ] Implement identity online capture -> Edge encryption -> private ciphertext; decrypt endpoint authorization/audit, no-store. KMS/key custody được chọn và rotation/TTL restore test xong trước upload thật. Không dùng pgsodium mới.
- [ ] Purge hằng ngày retry/tombstone; deny housekeeping xem giấy tờ; UAT thực hành quy trình phòng trả/đang ở/khu chung/đồ quên. Commit `feat: implement housekeeping controls and private document lifecycle`.

**Done:** chỉ người nghiệm thu đúng quyền mở ready, đầy đủ BP01-BP05, sensitive media không lọt cache/export.

## T12. Ops PWA offline có đồng bộ an toàn

**Phụ thuộc:** T11. **Ước lượng:** 3-4 ngày.

**Files tạo:** `apps/web/src/app/manifest.ts`, `apps/web/public/ops-sw.js`, `apps/web/src/lib/pwa/{db,queue,sync,cache-policy}.ts`, `apps/web/src/features/ops/components/sync-status.tsx`, `supabase/migrations/202612010005_offline_ops.sql`, `tests/e2e/offline-housekeeping.spec.ts`.

**Interface:** applyChecklistOp contract; UUID dedupe; `baseVersion`; IndexedDB stores accountScope/tasks/operations/mediaDrafts, logout purge.

- [ ] Test offline edit + chụp fixture ảnh, reload app, reconnect; queue applied một lần; server changed -> conflict; revoked role -> forbidden, giữ draft để người dùng xử lý nhưng không upload trái quyền.

```ts
await context.setOffline(true);
await page.getByLabel('Ghi chú bước 1').fill('Đã kiểm tra đồ quên');
await page.reload();
await expect(page.getByText('Chờ đồng bộ')).toBeVisible();
await context.setOffline(false);
await page.getByRole('button', {name:'Đồng bộ ngay'}).click();
await expect(page.getByText('Đã đồng bộ')).toBeVisible();
```

- [ ] Chạy fail; implement cache allowlist, route scope `/ops/`, app shell, quota/TTL/media limits, foreground sync/retry/backoff. Không cache auth response/CCCD/ledger/CRM; không thanh toán/approve offline.
- [ ] Conflict UI so bản draft/server và giải thích role/assignment thay đổi; tab khác sync cùng op không duplicate. Logout clear; update SW không mất queue.
- [ ] Test Chrome Android và Safari/iOS bằng thiết bị hoặc browser phù hợp, restart/quota-full/expired session. Commit `feat: enable safe offline housekeeping in ops pwa`.

**Done:** nhân viên phân biệt draft/queued/synced/conflict; test chứng minh không mất ghi chú qua restart và không ghi đè bản mới.

## T13. Shop catalogue, tồn kho và QR nghi lễ

**Phụ thuộc:** T02,T04. **Ước lượng:** 3-4 ngày.

**Files tạo:** `supabase/migrations/202612150001_shop.sql`, `packages/api/src/shop.ts`, `apps/web/src/app/(public)/shop/{page.tsx,[slug]/page.tsx,danh-muc/[slug]/page.tsx}`, `apps/web/src/app/(public)/la/[slug]/page.tsx`, `apps/web/src/app/admin/{san-pham,kho}/page.tsx`, `tests/integration/stock.test.ts`, `tests/e2e/catalog.spec.ts`.

**Interface:** product/variant/inventory/energy published projection; reserve/release/ship stock RPC atomically; ritual slug public content; stock notification outbox.

- [ ] Test product thiếu Energy Card không publish; variant price/stock khác nhau; hai reserve tranh SKU cuối chỉ một thành công; release lặp không cộng kho hai lần; back-in-stock cần consent.
- [ ] Chạy fail; implement 9 categories, admin variants/photos/energy/video, 2 warehouses, SKU unique, availability. Import catalogue prototype chỉ local/staging, ≥20 SKU thật phải qua content approval.
- [ ] Build W28-W30 filters/sort/pagination, OOS hiện + notify, W35 steps/media/reduced motion/offline public text nếu đã tải; không lot/vendor/diary.
- [ ] Run stock/tenant tests và catalog visual/a11y; commit `feat: add product catalog energy cards and warehouse inventory`.

**Done:** public data thật/published, stock race pass, QR giải thích nghi lễ không lộ order/PII.

## T14. CMS, search, revisions và lịch truyền thông

**Phụ thuộc:** T04; làm song song chuỗi shop nếu đủ người. **Ước lượng:** 3-4 ngày.

**Files tạo:** `supabase/migrations/202612150002_content.sql`, `apps/web/src/features/content/{markdown,queries,actions}.ts`, `apps/web/src/app/(public)/blog/{page.tsx,[slug]/page.tsx,danh-muc/[slug]/page.tsx}`, `apps/web/src/app/(public)/tim-kiem/page.tsx`, `apps/web/src/app/admin/noi-dung/page.tsx`, `tests/integration/content.test.ts`, `tests/e2e/cms.spec.ts`.

**Interface:** `publish_content(postId,expectedVersion)`, `restore_revision(postId,revisionId)` tạo bản mới; `search_public(query,kinds,page)` chỉ public projection; outbox cache.invalidate sau publish.

- [ ] Test scheduled chưa tới giờ không public/search; script/MDX input không thực thi; restore v1 sau v3 tạo v4; tiếng Việt có/không dấu trả bài đúng; editor không xem orders.
- [ ] Chạy fail; implement Markdown sanitized (allowlist embeds YouTube), upload alt/mime, preview noindex, workflow, revisions, slug redirects, GIN tsvector unaccent cập nhật bằng trigger.
- [ ] Trang policy/giới thiệu dùng CMS model S0 mở rộng; lịch tuần/kênh/owner/status import từ spreadsheet; không tự gửi campaign khi chỉ import lịch. Related/CTA chỉ target published/mở flag.
- [ ] Contact/newsletter validation/rate-limit/consent + mail outbox; run cms/search/timezone tests; commit `feat: add editorial cms and vietnamese content search`.

**Done:** đủ CNT-01/02/05, scheduled/revision hoạt động có test, public content không JS, preview không lọt sitemap.

## T15. Giỏ, checkout COD/bank và fulfillment

**Phụ thuộc:** T06,T07,T13. **Ước lượng:** 3-4 ngày.

**Files tạo:** `packages/core/src/shop/{shipping,fulfillment,shipping.test}.ts`, `apps/web/src/features/shop/components/{cart,checkout,order-timeline}.tsx`, `apps/web/src/app/(guest)/{gio-hang,thanh-toan,don-hang/[code]}/page.tsx`, `supabase/migrations/202612150003_shop_checkout.sql`, `tests/e2e/shop-checkout.spec.ts`, `tests/integration/shop-orders.test.ts`.

**Interface:** createShopOrder(ShopSelection), shared payments/guest receipt; fulfillment transition RPC has expectedVersion, stock reservation and ritual deadline.

- [ ] Test ship boundary 499.999/500.000 đ, local/auth cart merge, tampered client price ignored, checkout duplicate, COD shipped unpaid, transfer expiry/late money, ritual `<24h` không ship.

```ts
expect(shippingFee(499999n, {fee:30000n, freeThreshold:500000n})).toBe(30000n);
expect(shippingFee(500000n, {fee:30000n, freeThreshold:500000n})).toBe(0n);
```

- [ ] Chạy fail; implement server reprice/reserve + atomic order, address region config, COD/bank only, bank expiry policy version, status timeline và QR card.
- [ ] Admin packing/ritual/ship/completed/cancel/return; stock movement/idempotency, manual tracking, actual COD receipt; refund approval/evidence reuse T06. Guest phone-only receipt giữ scoped session.
- [ ] E2E F2 cho COD và bank, insufficient stock/reconnect/error; commit `feat: enable shop checkout and fulfillment`.

**Done:** trạng thái paid/fulfilled không lẫn, không âm tồn, không phát sinh giao hàng/hoàn tiền từ action thiếu quyền.

## T16. CRM 360, segmentation và chiến dịch

**Phụ thuộc:** T03,T07,T14,T15. **Ước lượng:** 2-3 ngày.

**Files tạo:** `supabase/migrations/202612150004_crm.sql`, `packages/api/src/crm.ts`, `apps/web/src/app/admin/khach-hang/{page.tsx,[id]/page.tsx}`, `apps/web/src/features/crm/{segments,actions}.ts`, `apps/web/src/app/admin/thong-bao/page.tsx`, `tests/integration/crm.test.ts`, `tests/e2e/crm.spec.ts`.

**Interface:** contact normalization, verified merge transaction + audit, filter JSON allowlist (visits,lastStay,hasShopOrder,source,tag,marketingConsent), campaign recipient snapshot/outbox.

- [ ] Test same phone chưa verify không chuyển ownership; merge không mất orders/history; staff sai entity không export; opt-out sau snapshot trước send không nhận campaign; CSV formula injection escaped.
- [ ] Chạy fail; implement CRM timeline GĐ0, contacts/tags/notes/source, authorized merge, dynamic segments/count/list/export, campaign draft/preview/send flow có explicit user action.
- [ ] Recheck consent/suppression lúc gửi, dedupe recipient+campaign, throttle provider, delivery logs/retry; không tự gửi marketing thật trong seed/UAT.
- [ ] Run CRM privileges/consent/export tests; commit `feat: add scoped customer crm and consent-aware campaigns`.

**Done:** ADM-02 có segment/export/send hoạt động; timeline tương lai không tạo dữ liệu giả; không auto-link identity theo contact tự khai.

## T17. Dashboard, sổ cái và cấu hình vận hành

**Phụ thuộc:** T06,T09,T10,T15,T16. **Ước lượng:** 2-3 ngày.

**Files tạo:** `supabase/migrations/202612150005_reporting.sql`, `packages/core/src/commerce/{metrics,metrics.test}.ts`, `apps/web/src/app/admin/{page.tsx,don-hang/page.tsx,so-cai/page.tsx,cau-hinh/page.tsx,audit/page.tsx}`, `tests/integration/reporting.test.ts`.

**Interface:** reports scoped SQL/RPC `get_location_metrics(entityId,locationId,from,to)` returns recognizedRevenueBySource, cashCollected, depositsLiability, occupancy, adr, bookingsByChannel, shopOrders; filters match current roles.

- [ ] Fixture 5 nguồn, partial cọc, refund, OTA chưa trả, room closed ngày cụ thể; test doanh thu không cộng hai lần tiền cọc, ADR không có service, occupied nights đúng timezone; export khớp ledger events.
- [ ] Chạy fail; implement recognition event theo spec, service/manual order để nhập doanh thu ngoài web, zero/empty honest UI, authorized CSV export, order refund status/evidence.
- [ ] Filter entity/location/date thực thi DB, không lấy all rồi lọc browser; chart lazy; settings versioned/audited. Tài chính ký quy tắc recognition trước số liệu thật.
- [ ] Run reconciliation/permissions tests; commit `feat: add five-source operating dashboard and ledger exports`.

**Done:** ADM-01 và W112/W118 có số từ dữ liệu giao dịch thật, báo cáo entity không lộ chéo, không giả warehouse GĐ3.

## T18. SEO/LLMO, accessibility và performance

**Phụ thuộc:** T04,T05,T13,T14; chạy sớm trên template rồi kiểm lại khi hoàn tất. **Ước lượng:** 2-3 ngày.

**Files tạo:** `apps/web/src/lib/seo/{metadata,json-ld,public-routes}.ts`, `apps/web/src/app/{robots.ts,sitemap.ts,llms.txt/route.ts}`, `tests/e2e/{seo,accessibility}.spec.ts`, `tests/performance/public-pages.ts`, `scripts/check-links.mjs`, `docs/seo-content-checklist.md`.

**Interface:** metadata helpers canonical from SITE_URL, JSON-LD sanitized, published route registry; no guest/private route included.

- [ ] Write no-JS fetch tests Article/Product/LodgingBusiness, single canonical, no draft/receipt/token in sitemap/llms; injection test `</script>` escaped. Keyboard/axe trên public/booking/Ops representative.
- [ ] Chạy fail; implement metadata/OG, sitemap/robots/llms, structured data đúng published content, heading/FAQ/internal links, redirects/noindex/search handling.
- [ ] Measure 5 template lab median 3 runs, bundle split/image/font, TTFB/API from VN and realtime. Fix until spec threshold, lưu môi trường/trace và field-vs-lab distinction.
- [ ] Run all SEO/a11y checks + build; commit `feat: deliver crawlable seo and llm-readable public content`.

**Done:** Performance ≥85, SEO ≥95, Accessibility ≥90; public HTML hữu ích không JS, llms chỉ published links, không hứa ranking.

## T19. UAT, release, restore drill và bàn giao vận hành

**Phụ thuộc:** task của sprint tương ứng, toàn bộ T01-T18 cho S3. **Ước lượng:** 3-5 ngày kỹ thuật + một tuần UAT S2.

**Files tạo:** `docs/runbooks/{payments,restore,keys,notifications,offline-conflicts}.md`, `docs/releases/{s0,s1,s2,s3}.md`, `docs/uat/{frontdesk,housekeeping,shop,content}.md`, `apps/web/src/app/{ops,admin}/trang-thai/page.tsx`, `tests/integration/maintenance.test.ts`, `docs/evidence/README.md`.

**Interface:** job_runs/incident_records health projection, release evidence links (CI runs, trace/screenshot đã redact, signoff). Không đưa video/ảnh CCCD vào evidence repository.

- [ ] Viết UAT từng actor, dữ liệu/expected state theo 14 stories; chạy local/staging full checks `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:db`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`. Chạy kiểm secret/RLS/types.
- [ ] Restore DB + Storage vào môi trường cô lập; replay deletion tombstones, check event ledger/outbox không gửi lại thật, đo RPO/RTO, lưu bằng chứng. Kiểm PITR add-on, snapshot retention và tuần backup objects thực sự có.
- [ ] Diễn tập iCal down/late payment/outbox failure/key rotate/offline conflict; status/redaction alerts được người trực nhận. Dùng kênh thông báo cấu hình khi triển khai, không gửi tin cho người khác ở giai đoạn viết plan.
- [ ] Quản lý điểm ký LT/BP/BM, content/legal duyệt chính sách, finance duyệt bank/recognition/refund, CTO duyệt hạ tầng. Seed validator production từ chối ảnh placeholder/giá mẫu/liên hệ giả/secret thiếu.
- [ ] Train nhân viên bằng video 10 phút + thực hành; S1 thu 3 booking thật, S2 ghi ≥90% checklist ca sau 1 tuần, S3 20 SKU + đơn thật đầu tiên. Chưa đạt thì báo release pending thực địa, không thay bằng test seed.
- [ ] Migration dry-run, deploy staging, promote từng release đã đủ gate, trực 48h; rollback app/forward fix, restore chỉ theo runbook. Commit `docs: hand over gd0 release and operational evidence`.

**Done:** người vận hành sử dụng được, tất cả MUST có evidence, backup phục hồi được, không lỗi nghiêm trọng còn mở; không tuyên bố GĐ0 hoàn thành chỉ vì build xanh.

## 3. Checklist tự rà soát plan

- [ ] 14 story trong product spec đều có task/màn hình/test; chuẩn LT/BP/BM01-BM04 không mất bước an toàn.
- [ ] Contract trong T05-T17 trùng tên/schema/money encoding; functions được tạo trong task sở hữu trước task tiêu thụ.
- [ ] S0 có schema core/stay/shop/commerce, S1 có policy trước thu dữ liệu; email là kênh chính, trạng thái Zalo được báo đúng.
- [ ] RLS, current-role revocation, cross-table booking conflict, stock race, late payment, private guest links, offline conflict, identity TTL và backups đều có bài test hoặc drill.
- [ ] Không lọt LMS/Premium/Give/payout/native vào scope; không thiếu CRM campaigns và revenue ngoài web vì sợ kéo thêm module.
- [ ] Release checklist tách test kỹ thuật khỏi kết quả thật và các quyết định kinh doanh chưa duyệt.
