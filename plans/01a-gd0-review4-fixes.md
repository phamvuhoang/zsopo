# GĐ0 Review 4: sửa toàn bộ lỗi review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa 16 lỗi code, 4 chỗ thiếu so với spec và 2 lỗi seed tìm thấy ở review 4 (30/10/2026), rồi cập nhật artifact "ZSOPO GĐ0" cho khớp hệ thống đã sửa.

**Architecture:** Sửa tại chỗ trong migration gốc (nhánh `main` chưa có migration nào, giống review 2 và 3). Nếu một hàm đã bị `create or replace` ở migration sau thì sửa bản cuối cùng. Mỗi lỗi có test fail trước khi sửa: lỗi DB nằm trong `tests/integration/review4.test.ts` (hoặc file test sẵn có của module khi helper nằm ở đó), lỗi UI dùng Playwright. Không thêm dependency.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres, PostgREST, pg_cron, Auth TOTP), Vitest (unit, integration), Playwright.

**Spec:** `../specs/01-product-gd0.md`, `../specs/02-architecture.md`, `../docs/implementation-rulings.md`. Danh sách lỗi gốc ở bảng "Nguồn lỗi" dưới đây.

## Global Constraints

- Tiền nguyên VND (`bigint`), JSON truyền chuỗi số; ngày giờ nghiệp vụ theo `Asia/Ho_Chi_Minh`.
- Lỗi domain dùng `core.fail(code, detail)`; client nhận `error.message = code` (`FORBIDDEN`, `VALIDATION`, `INVALID_TRANSITION`, `SOLD_OUT`, `VERSION_CONFLICT`).
- RPC mới: `security definer set search_path = ''`, kiểm `core.has_permission(action, entity, location)` trước khi đọc/ghi, `revoke … from public` rồi `grant` đúng vai trò như các hàm cùng file. Hàm nội bộ: revoke khỏi `public, anon, authenticated`.
- Không xóa lịch sử tiền: điều chỉnh bằng dòng đảo (`order_items.reversal_of`) hoặc ledger event mới, tổng mỗi event bằng 0.
- Copy tiếng Việt có dấu, không em dash/en dash, không lời hứa y khoa.
- Sau mỗi thay đổi schema/hàm: `pnpm db:reset && pnpm db:types && pnpm check:types` sạch.
- Mỗi task thêm một dòng vào mục `## Review 4 (30/10/2026)` cuối `docs/implementation-rulings.md` (tạo mục ở task đầu tiên): lỗi, cách sửa, tên test. Quyết định mới ghi dạng `Ruling: … — cost if wrong: …`.
- Chạy một test integration: `pnpm exec vitest run --project integration <file> -t "<tên test>"`. Corepack cũ báo `Cannot find module …pnpm.cjs` thì dùng `npx pnpm@12.15.0` (docs/setup.md).
- Mỗi task một commit, chỉ sau khi `pnpm test:integration` (và e2e liên quan) xanh.

## Review Focus

1. Hai nhân viên cùng áp tiền đối soát cho một đơn: tiền chỉ được áp một lần (test ở Task 2).
2. Tiền nhận lúc 23:30 giờ Việt Nam phải tính vào đúng ngày Việt Nam đó, server chạy UTC (test ở Task 10).
3. Đơn shop đã thu đủ rồi trả hàng: đơn hiện trong danh sách cần hoàn, số có thể hoàn > 0 (test ở Task 7).
4. Lưu nháp một trang chưa từng đăng vẫn sửa tại chỗ, không sinh bản nháp treo (test ở Task 5).
5. Đổi slug A → B → C → A: không có redirect vòng, `/blog/A` không bị redirect (test ở Task 13).

## Nguồn lỗi

| Mã | Lỗi | Task |
|---|---|---|
| #1 | Tiền vào đối soát (`customer_credit`) không bao giờ áp vào đơn; `confirm_with_exception` để `paid_amount` = 0 | 2 |
| #2 | `save_page` với `p_publish=false` gỡ trang đang công khai (đóng đặt phòng, shop, liên hệ nếu là chính sách) | 5 |
| #3 | Ghi nhận chuyển khoản không cần MFA; `payment.confirm` có trong ma trận nhưng không ai kiểm | 1 |
| #4 | Hold hết hạn rồi tiền thiếu cọc: booking `needs_review` giữ phòng, đơn vẫn `expired`, không hiện ở admin | 2, 4 |
| #5 | Đơn shop chuyển khoản được xác nhận khi chưa trả không bao giờ hết hạn, vẫn giao được | 6 |
| #6 | Dịch vụ đặt trước bị hủy khi hold hết hạn không được khôi phục khi booking xác nhận lại | 3 |
| #7 | Form hoàn tiền không có cho đơn đã hủy, thừa tiền | 4 |
| #8 | Mã biên nhận quầy `QUAY-${Date.now()}` làm hỏng idempotency, tiền mặt có thể ghi hai lần | 10 |
| #9 | Ô "Thời điểm nhận" (`datetime-local`) bị đọc theo UTC trên Vercel, lệch +7h | 10 |
| #10 | Trả hàng vẫn tính doanh thu sản phẩm | 7 |
| #11 | Giảm giá đặt trước dịch vụ không trừ khỏi doanh thu | 8 |
| #12 | Export CSV sổ cái và CRM bị cắt ở 1000 dòng (`max_rows`); export sổ cái không ghi audit | 9 |
| #13 | Dịch vụ đặt trước hẹn ngoài kỳ ở vẫn được giảm giá | 11 |
| #14 | Biên nhận khách ẩn dòng đã hủy nhưng hiện dòng đảo, cộng không ra tổng | 12 |
| #15 | Đổi slug bài về slug cũ vi phạm `check (from_path <> to_path)` | 13 |
| #16 | Deploy (cả `db push` production) không chờ CI xanh | 14 |
| G1 | BP01: checklist không có ảnh (`mediaIds: []`) | 15 |
| G2 | BP04: không có lịch lặp ngày/tuần/tháng | 16 |
| G3 | Spec §6: COD quá 24 giờ chưa xác nhận không được nhắc | 17 |
| G4 | LT02: nhận phòng không lưu khách ký nhận | 18 |
| S1 | Cả 24 sản phẩm mẫu có `ritual_slug` nên mọi đơn chờ 24h; cờ nghi lễ gắn nhầm vào trang QR | 19 |
| S2 | Seed ghi "Giáng sinh 24-26/12" nhưng `daterange` chỉ gồm đêm 24, 25 | 19 |
| A | 13 chỗ sai trong artifact GĐ0 | 20 |

Ngoài phạm vi: analytics (bị chặn bởi DSN PostHog và chính sách consent, ruling T1); bốn việc "Hoãn" từ review cuối (đã hoãn trước review 4); MFA cho mọi hành động của `ops_finance` (xem "Quyết định mở" cuối plan).

---

### Task 1: Xác nhận chuyển khoản cần MFA (#3)

**Files:**
- Modify: `supabase/migrations/202611030001_core.sql:349-370` (thêm `('front_desk','payment.confirm',true)`, `('location_manager','payment.confirm',true)`; `ops_finance` đã có)
- Modify: `supabase/migrations/202611170002_payments.sql:118` (`record_payment_atomic`)
- Modify: `apps/web/src/app/admin/thanh-toan/page.tsx:16` (gate `payment.confirm`)
- Modify: `tests/integration/helpers.ts`, `tests/integration/review-fixes.test.ts` (chuyển `asAal2`, `heldBooking` sang helpers)
- Modify: mọi test ghi chuyển khoản bằng `clientFor` (tìm bằng `grep -rn "bank_transfer\|vietqr_manual" tests/integration`)
- Modify: `supabase/seed.sql` (TOTP factor), `scripts/seed-validate.mjs` (`--production` từ chối `auth.mfa_factors`)
- Create: `tests/e2e/staff-login.ts`
- Modify: `tests/e2e/booking.spec.ts:29-43`, `tests/e2e/auth.spec.ts`
- Modify: `.github/workflows/ci.yml` (export `SUPABASE_JWT_SECRET` từ `JWT_SECRET`, có `::add-mask::`), `docs/setup.md`
- Create: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces (helpers.ts):
  - `aal2ClientFor(user: { id: string; email: string }): SupabaseClient`: JWT HS256 ký bằng `process.env.SUPABASE_JWT_SECRET` (thiếu thì throw như `SERVICE_KEY`), claims `{ sub: user.id, email, role: "authenticated", aud: "authenticated", aal: "aal2", exp: now + 3600 }`, gửi qua `global.headers.Authorization`. Ký bằng `node:crypto` `createHmac("sha256")`.
  - `asAal2(user: string, call: string, params: unknown[])`: chuyển nguyên từ review-fixes.test.ts.
  - `heldBooking(services?: (stay: { arrival: string; departure: string }) => { serviceId: string; qty: number; scheduledAt: string }[], opts?: { price?: number }): Promise<{ room: string; arrival: string; departure: string } & HoldResult>`: thân lấy từ review-fixes.test.ts; 1 đêm, giá mặc định 1.000.000 nên `deposit_due` = 300.000.
- Produces (e2e): `totp(secretBase32: string, atMs?: number): string` (RFC 6238, SHA-1, 30 giây, 6 số) và `staffLogin(page: Page, email: string, opts?: { mfa?: boolean; next?: string }): Promise<void>` trong `tests/e2e/staff-login.ts`; hằng `E2E_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"`.

- [ ] **Step 1: Viết test fail**

```ts
describe("review4 #3 MFA chuyển khoản", () => {
  it("lễ tân chưa MFA không ghi được chuyển khoản; có MFA thì được; tiền mặt không cần MFA", async () => {
    const h = await heldBooking();
    const bank = (c: SupabaseClient) => recordPayment(c, { orderId: h.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "100000",
      receivedAt: new Date().toISOString(), evidenceNote: "Sao kê dòng 1", idempotencyKey: randomUUID() });
    const r1 = await bank(await clientFor(USERS.frontDesk));
    expect(!r1.ok && r1.error.code).toBe("FORBIDDEN");
    expect((await bank(aal2ClientFor(USERS.frontDesk))).ok).toBe(true);
    const cash = await recordPayment(await clientFor(USERS.frontDesk), { orderId: h.orderId, provider: "cash", providerRef: randomUUID(), amount: "50000",
      receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    expect(cash.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy, thấy fail ở `r1`** (đang ghi được)

Run: `pnpm exec vitest run --project integration tests/integration/review4.test.ts -t "#3"`

- [ ] **Step 3: Sửa SQL**

Thêm hai dòng ma trận. Trong `record_payment_atomic`, ngay sau `can_record_payment`: nếu `p_provider in ('bank_transfer','vietqr_manual')` và không có `payment.confirm` ở `(o.entity_id, o.location_id)` thì `core.fail('FORBIDDEN', 'Xác nhận chuyển khoản cần xác thực hai lớp (MFA)')`. Trang `/admin/thanh-toan` gọi `requirePermission("payment.confirm", …)`, để người chưa MFA được chuyển sang `/auth/mfa`.

- [ ] **Step 4: Chạy lại test, thấy pass; đổi các test ghi chuyển khoản sang `aal2ClientFor`; chạy `pnpm test:integration` xanh**

- [ ] **Step 5: E2E MFA**

Seed thêm factor đã xác minh cho `le-tan@` (`…0001`) và `tai-chinh@` (`…0005`):

```sql
-- LOCAL ONLY: TOTP cố định cho e2e (secret = E2E_TOTP_SECRET trong tests/e2e/staff-login.ts).
insert into auth.mfa_factors(id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
select gen_random_uuid(), u, 'e2e', 'totp', 'verified', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', now(), now()
from unnest(array['a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000005']::uuid[]) u;
```

`staffLogin` điền Email, Mật khẩu (`zsopo-local-1`), bấm "Đăng nhập"; nếu `mfa`, chờ URL `/auth/mfa`, điền "Mã 6 số" = `totp(E2E_TOTP_SECRET)`, bấm "Xác nhận". `staffPays` trong booking.spec.ts dùng `staffLogin(p, "le-tan@example.test", { mfa: true, next: "/admin/thanh-toan" })`. Trong auth.spec.ts thêm:
- `test("totp đúng vector RFC 6238")`: `expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082")`.
- `test("lễ tân qua MFA mở được trang xác nhận chuyển khoản")`: sau `staffLogin(..., { mfa: true })` thấy heading của `/admin/thanh-toan`.

Nếu GoTrue không nhận factor seed (verify trả lỗi), dừng lại báo cáo; không đổi sang cách khác khi chưa được duyệt.

- [ ] **Step 6: Chạy `pnpm test:e2e auth booking` xanh, `pnpm check:seed` xanh**

- [ ] **Step 7: Commit** `fix: require mfa to confirm bank transfers`

---

### Task 2: Tiền tới muộn được áp vào đơn khi booking xác nhận lại (#1, #4)

**Files:**
- Modify: `supabase/migrations/202611170002_payments.sql` (hàm mới, `record_payment_atomic`, `confirm_with_exception`)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Consumes: `heldBooking`, `asAal2` (Task 1).
- Produces: `commerce.apply_review_payments(p_order uuid) returns bigint` (nội bộ, người gọi đã khóa đơn). Với mỗi payment `needs_review` của đơn (nối qua `ledger_events.payment_id/order_id`): `v = least(p.amount, total - paid_amount)`; nếu `v > 0` thì thêm `payment_allocations`, cập nhật `paid_amount`/`payment_status` (cùng biểu thức như `record_payment_atomic`), `post_ledger(kind 'payment.applied', key 'payment.applied:' || p.id, lines customer_credit +v, deposit_liability -v)`; đặt payment `allocated`, `review_reason = null`. Phần dư vẫn là `customer_credit`. Trả tổng đã áp.

- [ ] **Step 1: Viết test fail**

```ts
const block = (bookingId: string) => sql<{ id: string }>(`insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
  select b.entity_id, b.location_id, b.room_id, stay.stay_range(b.location_id, b.arrival, b.departure), 'maintenance', gen_random_uuid()
  from stay.bookings b where b.id = $1 returning id`, [bookingId]);
const expire = async (h: { bookingId: string; room: string }) => {
  await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [h.bookingId]);
  await sql(`select stay.expire_room_holds($1)`, [h.room]);
};
const cash = async (orderId: string, amount: string) => recordPayment(await clientFor(USERS.frontDesk),
  { orderId, provider: "cash", providerRef: randomUUID(), amount, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });

describe("review4 #1 #4 tiền tới muộn", () => {
  it("#1 tiền vào đối soát được áp vào đơn khi quản lý xác nhận ngoại lệ", async () => {
    const h = await heldBooking();
    await expire(h);
    const [blk] = await block(h.bookingId);
    const p = await cash(h.orderId, "300000");
    expect(p.ok && p.data.state).toBe("needs_review");
    await sql(`update stay.room_allocations set active = false where id = $1`, [blk!.id]);
    const r = await (await clientFor(USERS.manager)).schema("stay").rpc("confirm_with_exception", { p_booking: h.bookingId, p_reason: "Khách đã chuyển đủ cọc", p_due: 700000 });
    expect(r.error).toBeNull();
    expect((await sql(`select paid_amount::text v from commerce.orders where id = $1`, [h.orderId]))[0]!.v).toBe("300000");
    expect((await sql(`select state from commerce.payments where id = $1`, [p.ok && p.data.paymentId]))[0]!.state).toBe("allocated");
    expect((await sql(`select coalesce(sum(e.amount),0)::text v from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id
      where v.order_id = $1 and e.account = 'customer_credit'`, [h.orderId]))[0]!.v).toBe("0");
    // Review Focus 1: áp lần nữa không cộng thêm
    expect((await sql(`select commerce.apply_review_payments($1)::text v`, [h.orderId]))[0]!.v).toBe("0");
    expect((await sql(`select paid_amount::text v from commerce.orders where id = $1`, [h.orderId]))[0]!.v).toBe("300000");
  });

  it("#4 hold hết hạn rồi tiền thiếu cọc: đơn sang needs_review", async () => {
    const h = await heldBooking();
    await expire(h);
    const p = await cash(h.orderId, "100000");
    expect(p.ok && p.data.bookingState).toBe("needs_review");
    expect((await sql(`select status from commerce.orders where id = $1`, [h.orderId]))[0]!.status).toBe("needs_review");
  });
});
```

- [ ] **Step 2: Chạy, thấy fail** (`paid_amount` = 0; đơn `expired`)
- [ ] **Step 3: Sửa SQL**

Viết `apply_review_payments`. Gọi nó trong `confirm_with_exception` ngay sau khi chuyển booking sang `confirmed`. Gọi nó trong nhánh allocate của `record_payment_atomic` khi booking đang ở `held/expired/needs_review` và allocation đã có, trước khi so `paid_amount >= deposit_due` (đọc lại `o` sau khi gọi). Trong nhánh thiếu cọc thêm `update commerce.orders set status = 'needs_review' where id = o.id and status in ('pending','expired')`.

- [ ] **Step 4: Chạy test review4 và `pnpm test:integration`, thấy pass**
- [ ] **Step 5: Commit** `fix: apply reviewed late payments when a booking is reconfirmed`

---

### Task 3: Khôi phục dịch vụ đặt trước khi booking xác nhận lại (#6)

**Files:**
- Modify: `supabase/migrations/202612010001_services.sql:121-129` (`stay.on_booking_closed`)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Consumes: `heldBooking`, `expire`, `cash` (Task 2).

- [ ] **Step 1: Viết test fail**

```ts
it("#6 dịch vụ đặt trước quay lại hàng chờ khi tiền tới muộn xác nhận booking", async () => {
  const [tea] = await sql<{ id: string }>(`select id from stay.services where slug = 'tra-thao-moc-tai-phong'`);
  const h = await heldBooking(({ arrival }) => [{ serviceId: tea!.id, qty: 1, scheduledAt: `${arrival}T10:00:00+07:00` }]);
  await expire(h);
  expect((await sql(`select state from stay.service_requests where booking_id = $1`, [h.bookingId]))[0]!.state).toBe("cancelled");
  const [o] = await sql<{ d: string }>(`select deposit_due::text d from commerce.orders where id = $1`, [h.orderId]);
  const p = await cash(h.orderId, o!.d);
  expect(p.ok && p.data.bookingState).toBe("confirmed");
  expect((await sql(`select state from stay.service_requests where booking_id = $1`, [h.bookingId]))[0]!.state).toBe("requested");
});
```

- [ ] **Step 2: Chạy, thấy fail** (vẫn `cancelled`)
- [ ] **Step 3: Sửa trigger**

Trong `on_booking_closed`, thêm nhánh: `new.state = 'confirmed' and old.state in ('expired','needs_review')` thì đặt `state = 'requested'` cho các request `cancelled` của booking mà `order_items.status = 'active'` (nối `service_requests.order_item_id`). Request khách tự hủy có item `cancelled` nên không bị mở lại.

- [ ] **Step 4: Chạy test, thấy pass**
- [ ] **Step 5: Commit** `fix: reopen prebooked services when an expired booking is reconfirmed`

---

### Task 4: Danh sách đơn cần xử lý tiền gồm cả đơn cần hoàn (#7, hiển thị #4)

**Files:**
- Modify: `supabase/migrations/202611170002_payments.sql` (RPC mới cạnh `request_refund`)
- Modify: `apps/web/src/app/admin/thanh-toan/page.tsx:18-24` và phần render form hoàn tiền, ngoại lệ
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Consumes: `heldBooking`, `cash`, `transitionBooking`.
- Produces: `commerce.orders_to_settle(p_limit int default 50) returns table(id uuid, code text, kind text, status text, payment_status text, fulfillment_status text, total bigint, deposit_due bigint, paid_amount bigint, refundable bigint, booking_id uuid, booking_state text, due_at timestamptz, contact_snapshot jsonb, created_at timestamptz)`, grant `authenticated`. Chỉ trả đơn mà người gọi có `payment.record` tại `(entity, location)` hoặc `orders.manage` tại entity. Điều kiện: `status in ('pending','needs_review')`, hoặc `booking_state = 'needs_review'`, hoặc `refundable > 0 and (status in ('cancelled','expired') or payment_status = 'overpaid' or paid_amount > total)`. `refundable = commerce.refundable(o.id)` trừ các `refund_requests` đang `requested`. Sắp `created_at desc`.

- [ ] **Step 1: Viết test fail**

```ts
it("#7 booking đã xác nhận rồi bị hủy hiện trong danh sách cần hoàn, đúng số tiền", async () => {
  const h = await heldBooking();
  await cash(h.orderId, "300000");
  const [b] = await sql<{ version: number }>(`select version from stay.bookings where id = $1`, [h.bookingId]);
  const c = await transitionBooking(await clientFor(USERS.manager), { bookingId: h.bookingId, expectedVersion: b!.version, action: "cancel", reason: "Khách hủy", idempotencyKey: randomUUID() });
  expect(c.ok).toBe(true);
  const { data, error } = await (await clientFor(USERS.frontDesk)).schema("commerce").rpc("orders_to_settle", {});
  expect(error).toBeNull();
  expect((data as { id: string; refundable: number }[]).find((r) => r.id === h.orderId)?.refundable).toBe(300000);
});
```

- [ ] **Step 2: Chạy, thấy fail** (RPC chưa có)
- [ ] **Step 3: Viết RPC; trang dùng RPC thay cho query cũ.** Form hoàn tiền hiện khi `refundable > 0`, mặc định và tối đa là `refundable`. Form "Xác nhận ngoại lệ" hiện khi `booking_state = 'needs_review'`.
- [ ] **Step 4: Chạy test và `pnpm test:e2e admin-stay booking` xanh**
- [ ] **Step 5: Commit** `fix: list cancelled and overpaid orders for refund`

---

### Task 5: Lưu nháp trang đang công khai không gỡ trang (#2)

**Files:**
- Modify: `supabase/migrations/202612150002_content.sql` (bảng `content.page_drafts` cạnh `post_drafts`, `save_page` dòng 273-287, RLS, grants)
- Modify: `apps/web/src/app/admin/noi-dung/page.tsx:89-99`
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces: `content.page_drafts(page_id uuid primary key references content.pages(id), title text not null, excerpt text not null, body_md text not null, updated_by uuid, updated_at timestamptz not null default now())`. RLS select cho `content.write`, không grant ghi trực tiếp. `save_page` giữ nguyên chữ ký:
  - trang `published` + `p_publish=false`: upsert `page_drafts`, không đổi `pages`, trả `cur.version`;
  - `p_publish=true`: áp nội dung gửi lên vào `pages`, xóa `page_drafts`, ghi revision;
  - trang chưa đăng + `p_publish=false`: sửa tại chỗ như cũ.

- [ ] **Step 1: Viết test fail**

```ts
const scratchPage = async (status: "published" | "draft") => (await sql<{ id: string; version: number }>(
  `insert into content.pages(entity_id, slug, kind, title, excerpt, body_md, status, published_at)
   values ($1, 'thu-' || substr(md5(random()::text),1,8), 'policy', 'Trang thử', 'x', 'Bản gốc', $2, case when $2 = 'published' then now() end)
   returning id, version`, [E1, status]))[0]!;
const savePage = async (id: string, version: number, body: string, publish: boolean) =>
  (await clientFor(USERS.editor)).schema("content").rpc("save_page", { p_page: id, p_title: "Trang thử", p_excerpt: "x", p_body: body, p_expected_version: version, p_publish: publish });

describe("review4 #2 lưu nháp trang", () => {
  it("bỏ chọn Đăng khi sửa trang đang công khai: trang vẫn công khai, bản sửa nằm ở bản nháp", async () => {
    const pg = await scratchPage("published");
    expect((await savePage(pg.id, pg.version, "Bản nháp mới", false)).error).toBeNull();
    expect((await sql(`select status, body_md from content.pages where id = $1`, [pg.id]))[0]).toMatchObject({ status: "published", body_md: "Bản gốc" });
    expect((await sql(`select body_md from content.page_drafts where page_id = $1`, [pg.id]))[0]!.body_md).toBe("Bản nháp mới");
    expect((await savePage(pg.id, pg.version, "Bản nháp mới", true)).error).toBeNull();
    expect((await sql(`select body_md from content.pages where id = $1`, [pg.id]))[0]!.body_md).toBe("Bản nháp mới");
    expect(await sql(`select 1 from content.page_drafts where page_id = $1`, [pg.id])).toHaveLength(0);
  });

  it("trang chưa đăng vẫn sửa tại chỗ, không tạo bản nháp", async () => {
    const pg = await scratchPage("draft");
    expect((await savePage(pg.id, pg.version, "Sửa nháp", false)).error).toBeNull();
    expect((await sql(`select body_md from content.pages where id = $1`, [pg.id]))[0]!.body_md).toBe("Sửa nháp");
    expect(await sql(`select 1 from content.page_drafts where page_id = $1`, [pg.id])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Chạy, thấy fail** (bảng chưa có, trang bị chuyển `draft`)
- [ ] **Step 3: Sửa SQL; trang admin điền form từ `page_drafts` nếu có và hiện `<StatusBadge>Có bản nháp chưa đăng</StatusBadge>`**
- [ ] **Step 4: Chạy test, `pnpm test:e2e cms` xanh**
- [ ] **Step 5: Commit** `fix: keep published pages live when saving a draft`

---

### Task 6: Đơn shop chuyển khoản chưa trả không được giữ hàng mãi hay giao đi (#5)

**Files:**
- Modify: `supabase/migrations/202612150003_shop_checkout.sql:163-200` (`shop.transition_fulfillment`)
- Modify: `tests/integration/helpers.ts`, `tests/integration/review2.test.ts` (chuyển `address`, `placeShop`, `move`, `onHand` sang helpers)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces (helpers.ts): `placeShop(variantId: string, method?: "cod" | "bank")`, `move(orderId: string, to: string)`, `onHand(variantId: string)`, giữ nguyên thân từ review2.test.ts.

- [ ] **Step 1: Viết test fail**

```ts
describe("review4 #5 đơn chuyển khoản chưa trả", () => {
  it("được xác nhận khi chưa trả vẫn hết hạn và nhả hàng", async () => {
    const { variantId } = await seedSku({ onHand: 2 });
    const r = await placeShop(variantId, "bank");
    if (!r.ok) throw new Error(r.error.message);
    await move(r.data.orderId, "confirmed");
    expect((await sql(`select status from commerce.orders where id = $1`, [r.data.orderId]))[0]!.status).toBe("pending");
    await sql(`update commerce.orders set due_at = now() - interval '1 minute' where id = $1`, [r.data.orderId]);
    await sql(`select shop.expire_unpaid_orders()`);
    expect((await sql(`select status from commerce.orders where id = $1`, [r.data.orderId]))[0]!.status).toBe("expired");
    expect((await onHand(variantId)).reserved).toBe(0);
  });

  it("không cho chuyển sang sẵn sàng giao khi chưa nhận đủ tiền", async () => {
    const { variantId } = await seedSku({ onHand: 2 });
    const r = await placeShop(variantId, "bank");
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing"]) await move(r.data.orderId, to);
    const [o] = await sql<{ version: number }>(`select version from commerce.orders where id = $1`, [r.data.orderId]);
    const res = await transitionFulfillment(await clientFor(USERS.finance), { orderId: r.data.orderId, to: "ready_to_ship", expectedVersion: o!.version });
    expect(!res.ok && res.error.code).toBe("INVALID_TRANSITION");
  });
});
```

- [ ] **Step 2: Chạy, thấy fail**
- [ ] **Step 3: Sửa `transition_fulfillment`**

`status` chỉ sang `confirmed` khi `payment_method = 'cod' or payment_status in ('paid','overpaid')`. Từ chối `p_to in ('ready_to_ship','shipped')` khi `payment_method = 'bank' and payment_status not in ('paid','overpaid')`, với `core.fail('INVALID_TRANSITION', 'Đơn chuyển khoản chưa nhận đủ tiền')`.

- [ ] **Step 4: Chạy `pnpm test:integration` và `pnpm test:e2e shop-checkout`.** Test nào đang giao đơn chuyển khoản chưa trả thì sửa để trả tiền trước (bằng `aal2ClientFor`).
- [ ] **Step 5: Commit** `fix: keep unpaid bank orders pending until paid`

---

### Task 7: Trả hàng đảo doanh thu sản phẩm và giảm tổng đơn (#10)

**Files:**
- Modify: `supabase/migrations/202612150003_shop_checkout.sql:186-198` (nhánh `p_to = 'returned'`)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Consumes: `placeShop`, `move` (Task 6), `orders_to_settle` (Task 4).

- [ ] **Step 1: Viết test fail**

```ts
it("#10 trả hàng sau khi hoàn tất: doanh thu sản phẩm thuần bằng 0, đơn hiện để hoàn", async () => {
  const { variantId } = await seedSku({ price: 200000n, onHand: 2 });
  const r = await placeShop(variantId, "cod");
  if (!r.ok) throw new Error(r.error.message);
  for (const to of ["confirmed", "packing", "ready_to_ship", "shipped"]) await move(r.data.orderId, to);
  const [o] = await sql<{ total: string }>(`select total::text from commerce.orders where id = $1`, [r.data.orderId]);
  const fin = await clientFor(USERS.finance);
  expect((await recordPayment(fin, { orderId: r.data.orderId, provider: "cod", providerRef: randomUUID(), amount: o!.total, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() })).ok).toBe(true);
  await move(r.data.orderId, "completed");
  await move(r.data.orderId, "returned");
  expect((await sql(`select coalesce(sum(amount),0)::text v from commerce.order_items where order_id = $1 and revenue_source = 'product' and status = 'completed'`, [r.data.orderId]))[0]!.v).toBe("0");
  const rows = (await fin.schema("commerce").rpc("orders_to_settle", {})).data as { id: string; refundable: number }[];
  expect(rows.find((x) => x.id === r.data.orderId)?.refundable).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Chạy, thấy fail** (doanh thu còn 200.000)
- [ ] **Step 3: Sửa nhánh `returned`**

Với mỗi dòng `product` của đơn:
- dòng `completed`: thêm dòng đảo `item_type 'adjustment'`, `title 'Trả hàng: ' || title`, `qty -qty`, `amount -amount`, `revenue_source 'product'`, `status 'completed'`, `completed_at now()`, `reversal_of id`. Dòng gốc giữ nguyên để doanh thu kỳ cũ không đổi.
- dòng `active` (trả khi chưa hoàn tất): làm như `stay.reverse_service_item`, tức dòng gốc chuyển `cancelled` và thêm dòng đảo có `revenue_source null`.

Sau đó giảm `total` và `subtotal` theo tổng tiền hàng đã đảo (không giảm phí ship). Đặt `payment_status = 'overpaid'` khi `paid_amount > total` mới.

- [ ] **Step 4: Chạy test và `pnpm test:integration`, thấy pass**
- [ ] **Step 5: Commit** `fix: reverse product revenue on returns`

---

### Task 8: Doanh thu dịch vụ trừ giảm giá đặt trước (#11)

**Files:**
- Modify: `supabase/migrations/202612150005_reporting.sql:14-20,43-46`
- Test: `tests/integration/review4.test.ts`

- [ ] **Step 1: Viết test fail**

```ts
it("#11 doanh thu dịch vụ ghi nhận đã trừ giảm giá đặt trước", async () => {
  const [loc] = await sql<{ id: string }>(`insert into core.locations(entity_id, slug, name, status) values ($1, 'rv4-' || substr(md5(random()::text),1,8), 'Điểm review 4', 'test') returning id`, [E1]);
  const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status, subtotal, discount, total, deposit_due) values ($1, $2, 'manual', 'confirmed', 200000, 20000, 180000, 0) returning id`, [E1, loc!.id]);
  await sql(`insert into commerce.order_items(entity_id, order_id, item_type, title, qty, unit_price, amount, revenue_source, status, completed_at, snapshot) values
    ($1, $2, 'service', 'Bữa sáng', 1, 200000, 200000, 'own_service', 'completed', now(), '{"discount":"20000"}'),
    ($1, $2, 'adjustment', 'Ưu đãi đặt trước dịch vụ', 1, -20000, -20000, null, 'active', null, '{}')`, [E1, o!.id]);
  const d = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const { data } = await (await clientFor(USERS.finance)).schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: loc!.id, p_from: d, p_to: d });
  expect((data as { recognizedRevenueBySource: Record<string, string> }).recognizedRevenueBySource.own_service).toBe("180000");
});
```

- [ ] **Step 2: Chạy, thấy fail** (`200000`)
- [ ] **Step 3: Ở cả CTE `recognized` và phần `recog` của nghĩa vụ, dòng không phải `room` lấy `i.amount - coalesce((i.snapshot ->> 'discount')::bigint, 0)`**
- [ ] **Step 4: Chạy test và `reporting.test.ts`, thấy pass**
- [ ] **Step 5: Commit** `fix: net prebooking discounts out of recognized service revenue`

---

### Task 9: Export đủ dòng và ghi audit sổ cái (#12)

**Files:**
- Modify: `supabase/migrations/202611170002_payments.sql` (RPC mới), `supabase/migrations/202612150004_crm.sql:121-130,276` (`crm.export_segment` trả `jsonb`)
- Modify: `apps/web/src/app/admin/so-cai/export/route.ts`, `apps/web/src/app/admin/khach-hang/export/route.ts`
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces:
  - `commerce.export_ledger(p_entity uuid, p_account text default null) returns jsonb`: kiểm `ledger.export`; `core.audit(p_entity, 'ledger.export', 'ledger', null, jsonb_build_object('account', p_account))`; quá 100.000 dòng thì `core.fail('VALIDATION', 'Quá 100.000 dòng, hãy lọc theo tài khoản')`. Trả `jsonb_agg` các phần tử `{ recognitionDate, eventId, account, amount (text), source, createdAt }` theo `id`. Kết quả vô hướng nên `max_rows` không cắt.
  - `crm.export_segment(p_entity uuid, p_filter jsonb) returns jsonb`: mảng `{ displayName, email, phone, source, marketing }`, giữ kiểm quyền và audit cũ.

- [ ] **Step 1: Viết test fail**

```ts
it("#12 export sổ cái trả đủ hơn 1000 dòng và ghi audit", async () => {
  await sql(`select commerce.post_ledger($1, null, 'test.bulk', 'bulk:' || g || ':' || $2, null, null,
    jsonb_build_array(jsonb_build_object('account','cash','amount',1), jsonb_build_object('account','customer_credit','amount',-1)))
    from generate_series(1, 1001) g`, [E2, randomUUID()]);
  const { data, error } = await aal2ClientFor(USERS.superAdmin).schema("commerce").rpc("export_ledger", { p_entity: E2 });
  expect(error).toBeNull();
  expect((data as unknown[]).length).toBeGreaterThanOrEqual(2002);
  expect((await sql(`select count(*)::int n from core.audit_logs where action = 'ledger.export' and entity_id = $1`, [E2]))[0]!.n).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Chạy, thấy fail** (RPC chưa có)
- [ ] **Step 3: Viết RPC, đổi `export_segment`; hai route gọi RPC và dựng CSV từ mảng** (giữ `toCsv`, BOM, `Cache-Control: no-store`)
- [ ] **Step 4: Chạy test, `crm.test.ts`, `pnpm test:e2e crm dashboard` xanh**
- [ ] **Step 5: Commit** `fix: export full ledger and segment csv with audit`

---

### Task 10: Form ghi tiền dùng giờ Việt Nam và mã biên nhận quầy ổn định (#9, #8)

**Files:**
- Create: `packages/core/src/commerce/payment-input.ts`, `packages/core/src/commerce/payment-input.test.ts`
- Modify: `packages/core/src/index.ts` (export), `apps/web/src/features/payments-actions.ts:19`, `apps/web/src/features/ops/actions.ts:53-58`

**Interfaces:**
- Produces:
  - `vnLocalToIso(local: string): string`: nhận `YYYY-MM-DDTHH:mm`, coi là giờ Việt Nam (+07:00), trả ISO UTC; sai định dạng thì throw.
  - `deskReceiptRef(ref: string | undefined, idempotencyKey: string): string`: trả `ref` đã trim nếu khác rỗng, ngược lại `QUAY-${idempotencyKey}`.

- [ ] **Step 1: Viết test fail**

```ts
import { describe, expect, it } from "vitest";
import { deskReceiptRef, vnLocalToIso } from "./payment-input";

describe("payment input", () => {
  it("datetime-local là giờ Việt Nam, không phụ thuộc TZ của server", () => {
    expect(vnLocalToIso("2026-11-27T20:00")).toBe("2026-11-27T13:00:00.000Z");
    expect(vnLocalToIso("2026-11-27T23:30")).toBe("2026-11-27T16:30:00.000Z"); // Review Focus 2
    expect(() => vnLocalToIso("27/11/2026 20:00")).toThrow();
  });
  it("mã biên nhận quầy giữ nguyên qua các lần gửi lại cùng form", () => {
    expect(deskReceiptRef(undefined, "k1")).toBe("QUAY-k1");
    expect(deskReceiptRef("  ", "k1")).toBe("QUAY-k1");
    expect(deskReceiptRef("BN-9", "k1")).toBe("BN-9");
  });
});
```

- [ ] **Step 2: Chạy `pnpm test:unit -- payment-input`, thấy fail** (module chưa có)
- [ ] **Step 3: Viết hai hàm, dùng trong hai action.** `recordPaymentAction`: có `receivedAt` thì `vnLocalToIso`, không có thì `new Date().toISOString()`. `staffPayment`: tính `key` một lần rồi truyền `providerRef: deskReceiptRef(str(f, "providerRef"), key)` và `idempotencyKey: key`.
- [ ] **Step 4: Chạy `pnpm test:unit` và `pnpm typecheck`, thấy pass**
- [ ] **Step 5: Commit** `fix: read payment times as vietnam time and keep desk receipt refs stable`

---

### Task 11: Dịch vụ đặt trước chỉ hẹn trong kỳ ở (#13)

**Files:**
- Modify: `supabase/migrations/202611170001_stay_allocations.sql:326,345` (stub và lời gọi), `supabase/migrations/202612010001_services.sql:79-100`
- Modify: `tests/integration/review-fixes.test.ts:82` (đang hẹn dịch vụ ở `day + 30`, ngoài kỳ ở)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces: `stay.quote_services(p_room uuid, p_arrival date, p_departure date, p_services jsonb) returns jsonb`. Ngày hẹn theo giờ Việt Nam phải nằm trong `[p_arrival, p_departure]`, nếu không thì `core.fail('VALIDATION', format('%s chỉ đặt trong kỳ ở (%s đến %s)', svc.name, to_char(p_arrival,'DD/MM'), to_char(p_departure,'DD/MM')))`.

- [ ] **Step 1: Viết test fail**

```ts
it("#13 dịch vụ đặt trước ngoài kỳ ở bị từ chối, trong kỳ ở thì được", async () => {
  const room = (await seedRoom()).id;
  await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
  const [car] = await sql<{ id: string }>(`select id from stay.services where slug = 'xe-don-lien-khuong'`);
  const stay = { roomId: room, arrival: "2031-03-10", departure: "2031-03-11", adults: 2, childrenAges: [] };
  const out = await quoteStay(anonClient(), { ...stay, services: [{ serviceId: car!.id, qty: 1, scheduledAt: "2031-04-10T09:00:00+07:00" }] });
  expect(!out.ok && out.error.code).toBe("VALIDATION");
  const inside = await quoteStay(anonClient(), { ...stay, services: [{ serviceId: car!.id, qty: 1, scheduledAt: "2031-03-11T09:00:00+07:00" }] });
  expect(inside.ok).toBe(true);
});
```

- [ ] **Step 2: Chạy, thấy fail** (`out` ok)
- [ ] **Step 3: Đổi chữ ký ở cả hai chỗ khai báo, truyền `p_departure` từ `quote_stay`, thêm kiểm tra; sửa review-fixes.test.ts:82 hẹn trong kỳ ở**
- [ ] **Step 4: Chạy `pnpm test:integration` và `pnpm test:e2e room-services booking`, thấy pass**
- [ ] **Step 5: Commit** `fix: limit prebooked services to the stay dates`

---

### Task 12: Biên nhận khách cộng đúng tổng (#14)

**Files:**
- Modify: `supabase/migrations/202611170002_payments.sql:323-324` (`get_guest_receipt`)
- Modify: `packages/api/src/payments.ts:24`, `packages/core/src/contracts/index.ts:36` (`lines: { title: string; amount: string; cancelled?: boolean }[]`)
- Modify: `apps/web/src/app/(guest)/dat-phong/[code]/thanh-toan/page.tsx:78`, `apps/web/src/app/(guest)/don-hang/[code]/page.tsx` (dòng `cancelled` gạch ngang, thêm chữ "(đã hủy)")
- Test: `tests/integration/review4.test.ts`

- [ ] **Step 1: Viết test fail**

```ts
it("#14 biên nhận: tổng các dòng bằng total sau khi hủy dịch vụ có giảm giá", async () => {
  const [bf] = await sql<{ id: string }>(`select id from stay.services where slug = 'bua-sang-thuc-duong'`);
  const h = await heldBooking(({ departure }) => [{ serviceId: bf!.id, qty: 1, scheduledAt: `${departure}T07:00:00+07:00` }]);
  const [item] = await sql<{ id: string }>(`select id from commerce.order_items where order_id = $1 and item_type = 'service'`, [h.orderId]);
  await sql(`select stay.reverse_service_item($1)`, [item!.id]);
  const rc = await getGuestReceipt(anonClient(), h.guestToken!);
  if (!rc.ok) throw new Error(rc.error.message);
  expect(rc.data.lines.reduce((s, l) => s + Number(l.amount), 0)).toBe(Number(rc.data.total));
  expect(rc.data.lines.some((l) => l.cancelled)).toBe(true);
});
```

- [ ] **Step 2: Chạy, thấy fail**
- [ ] **Step 3: Bỏ điều kiện `status <> 'cancelled'`, thêm `'cancelled', i.status = 'cancelled'` vào từng dòng; cập nhật type và hai trang**
- [ ] **Step 4: Chạy test và `pnpm test:e2e booking room-services`, thấy pass**
- [ ] **Step 5: Commit** `fix: show cancelled lines so guest receipts add up`

---

### Task 13: Đổi slug bài về slug cũ (#15)

**Files:**
- Modify: `supabase/migrations/202612150002_content.sql:146-150` (`content.apply_snapshot`)
- Test: `tests/integration/content.test.ts` (dùng `draft`, `version` sẵn có)

- [ ] **Step 1: Viết test fail** (thêm vào `describe` CMS)

```ts
it("đổi slug A -> B -> C -> A: không redirect vòng, /blog/A không bị redirect", async () => {
  const { ed, id } = await draft("Bài đổi slug vòng");
  const pub = async () => ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await version(id), p_scheduled_at: null });
  const rename = async (slug: string) => ed.schema("content").rpc("save_post", { p: { id, entityId: E1, slug, title: "Bài đổi slug vòng", bodyMd: "x", expectedVersion: await version(id) } });
  await pub();
  const [a] = await sql<{ slug: string }>(`select slug from content.posts where id = $1`, [id]);
  for (const s of [`${a!.slug}-b`, `${a!.slug}-c`, a!.slug]) { await rename(s); expect((await pub()).error).toBeNull(); }
  expect(await sql(`select 1 from content.redirects where from_path = $1`, [`/blog/${a!.slug}`])).toHaveLength(0);
  expect(await sql(`select 1 from content.redirects where from_path = $1 and to_path = $2`, [`/blog/${a!.slug}-b`, `/blog/${a!.slug}`])).toHaveLength(1);
});
```

- [ ] **Step 2: Chạy, thấy fail** (lỗi khi đăng lần thứ ba)
- [ ] **Step 3: Trong `apply_snapshot`, trước khi insert redirect, thêm `delete from content.redirects where from_path = '/blog/' || (s ->> 'slug')`**
- [ ] **Step 4: Chạy `content.test.ts`, thấy pass**
- [ ] **Step 5: Commit** `fix: allow renaming a post back to an earlier slug`

---

### Task 14: Deploy chỉ chạy sau CI xanh (#16)

**Files:**
- Modify: `.github/workflows/ci.yml` (thêm `tags: ["v*"]` vào `on.push`; thêm job `deploy`)
- Delete: `.github/workflows/deploy.yml` (chuyển nội dung vào job `deploy`)

**Interfaces:**
- Produces: job `deploy` với `needs: check`, `if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))`; `environment`, `env` và các bước giữ nguyên từ deploy.yml.

- [ ] **Step 1: Sửa workflow**
- [ ] **Step 2: Kiểm cú pháp và phụ thuộc**

Run: `ruby -ryaml -e 'w = YAML.load_file(".github/workflows/ci.yml"); abort("thiếu needs") unless w["jobs"]["deploy"]["needs"] == "check"; puts "ok"'`
Expected: `ok`. Không còn file `.github/workflows/deploy.yml`.

- [ ] **Step 3: Commit** `ci: deploy only after the check job passes`

---

### Task 15: BP01 chụp ảnh trong checklist (G1)

**Files:**
- Modify: `apps/web/src/features/housekeeping/checklist-form.tsx` (input ảnh cho từng mục, `send(op, files)`)
- Modify: `apps/web/src/features/housekeeping/offline-checklist.tsx:40-49` (lưu ảnh thành media draft rồi `enqueue(userId, op, ids)`)
- Test: `tests/e2e/offline-housekeeping.spec.ts`

**Interfaces:**
- Consumes: `saveMediaDraft(userId, taskId, file): Promise<string>`, `enqueue(userId, op, mediaDraftIds)` (`apps/web/src/lib/pwa/queue.ts`); `syncNow` đã upload draft và điền `mediaIds`.
- Produces: `ChecklistForm` prop `send?: (op: ChecklistOp, files?: File[]) => Promise<…>`. Mỗi mục có `<input type="file" accept="image/*" capture="environment" aria-label={`Ảnh: ${item.label}`}>`. Ảnh đã chọn được gửi cùng câu trả lời kế tiếp của mục đó.

- [ ] **Step 1: Viết test e2e fail**

`test("BP01: chụp ảnh cho một mục, đồng bộ xong có đúng một ảnh trên server")`. Mở việc dọn như các test trong file. Gọi `page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/).setInputFiles({ name: "do-quen.jpg", mimeType: "image/jpeg", buffer: Buffer.from(JPEG_1PX_BASE64, "base64") })`, trong đó `JPEG_1PX_BASE64` là một JPEG 1x1 hợp lệ đặt thành hằng trong file test. Bấm "Đạt" cho mục đó, chờ "Đã lưu". Assert `sql("select cardinality(media_ids) n from stay.checklist_results where task_id = $1 and item_code = 'G2-1'")` có `n === 1`.

- [ ] **Step 2: Chạy `pnpm build && CI=1 pnpm exec playwright test offline-housekeeping --retries=0`, thấy fail** (không có input)
- [ ] **Step 3: Thêm input và tham số `files`; `OfflineChecklist.send` lưu từng file bằng `saveMediaDraft` rồi gọi `enqueue` với các id**
- [ ] **Step 4: Chạy lại test e2e và `housekeeping`, thấy pass**
- [ ] **Step 5: Commit** `feat: capture checklist photos offline`

---

### Task 16: BP04 lịch dọn khu chung theo ngày/tuần/tháng (G2)

**Files:**
- Modify: `supabase/migrations/202612010003_housekeeping.sql` (bảng, hai RPC, cron, grants)
- Modify: `apps/web/src/app/ops/lich-don/page.tsx`, file action của trang này (cùng chỗ với `createCommonTask`)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces:
  - `stay.common_area_schedules(location_id uuid references core.locations(id), area text, frequency text check (frequency in ('daily','weekly','monthly')), day smallint, active boolean not null default true, updated_by uuid, updated_at timestamptz not null default now(), primary key (location_id, area), check ((frequency = 'daily' and day is null) or (frequency = 'weekly' and day between 1 and 7) or (frequency = 'monthly' and day between 1 and 28)))`. RLS select cho `housekeeping.read`.
  - `stay.set_common_schedule(p_location uuid, p_area text, p_frequency text, p_day smallint) returns void`: cần `sop.manage`; `p_frequency` null thì `active = false`.
  - `stay.create_due_common_tasks(p_date date default (now() at time zone 'Asia/Ho_Chi_Minh')::date) returns int`: chỉ service role. Với mỗi lịch đang bật đến hạn ngày `p_date` (daily luôn; weekly khi `extract(isodow from p_date) = day`; monthly khi `extract(day from p_date) = day`), nếu chưa có việc `kind = 'common'` cùng điểm, cùng khu, cùng ngày Việt Nam thì tạo một việc, `due_at = (p_date + time '10:00') at time zone 'Asia/Ho_Chi_Minh'`. Trả số việc đã tạo.
  - Cron `common-area-tasks` lúc `5 17 * * *` (00:05 giờ Việt Nam).

- [ ] **Step 1: Viết test fail**

```ts
it("G2 lịch khu chung: hằng ngày mỗi ngày một việc, hằng tuần đúng thứ, chạy lại không trùng, chỉ quản lý được đặt lịch", async () => {
  const [loc] = await sql<{ id: string }>(`insert into core.locations(entity_id, slug, name, status) values ($1, 'kc-' || substr(md5(random()::text),1,8), 'Điểm khu chung', 'test') returning id`, [E1]);
  await sql(`insert into stay.common_area_schedules(location_id, area, frequency, day) values ($1, 'Sảnh', 'daily', null), ($1, 'Sân vườn', 'weekly', 1)`, [loc!.id]);
  const count = async (d: string) => (await sql<{ n: number }>(`select count(*)::int n from stay.housekeeping_tasks
    where location_id = $1 and kind = 'common' and (due_at at time zone 'Asia/Ho_Chi_Minh')::date = $2::date`, [loc!.id, d]))[0]!.n;
  await sql(`select stay.create_due_common_tasks('2031-01-06')`); // thứ Hai
  await sql(`select stay.create_due_common_tasks('2031-01-06')`);
  expect(await count("2031-01-06")).toBe(2);
  await sql(`select stay.create_due_common_tasks('2031-01-07')`); // thứ Ba
  expect(await count("2031-01-07")).toBe(1);
  const fd = await (await clientFor(USERS.frontDesk)).schema("stay").rpc("set_common_schedule", { p_location: L1, p_area: "Sảnh", p_frequency: "daily", p_day: null });
  expect(fd.error?.message).toBe("FORBIDDEN");
});
```

- [ ] **Step 2: Chạy, thấy fail** (bảng chưa có)
- [ ] **Step 3: Viết bảng, RPC, cron. Trang `/ops/lich-don` thêm form "Lịch khu chung"** (khu lấy từ template `common_area`, tần suất, ngày) **và danh sách lịch hiện có.** Seed không có lịch nào: vận hành tự cấu hình (câu hỏi F3 trong artifact).
- [ ] **Step 4: Chạy test, `pnpm test:e2e housekeeping`, thấy pass**
- [ ] **Step 5: Commit** `feat: schedule recurring common area cleaning`

---

### Task 17: Cảnh báo đơn COD quá 24 giờ chưa xác nhận (G3)

**Files:**
- Modify: `supabase/migrations/202612150003_shop_checkout.sql` (cột `commerce.orders.cod_overdue_at timestamptz` trong khối `alter table` dòng 26, hàm mới, cron)
- Modify: `supabase/migrations/202612280003_shop_order_placed_renderer.sql:27` (thêm `'cod.overdue'` vào nhóm cảnh báo vận hành, detail `'Đơn COD ' || orderCode || ' chưa được xác nhận sau ' || hours || ' giờ'`)
- Modify: `apps/web/src/app/admin/don-hang/page.tsx` (badge "Quá hạn xác nhận" khi `cod_overdue_at` có giá trị và `fulfillment_status = 'new'`)
- Test: `tests/integration/review4.test.ts`

**Interfaces:**
- Produces: `shop.flag_overdue_cod() returns int` (chỉ service role). Đơn `kind 'shop'`, `payment_method 'cod'`, `fulfillment_status 'new'`, `status not in ('cancelled','expired')`, `cod_overdue_at is null`, `created_at + make_interval(hours => coalesce((policy_snapshot -> 'params' ->> 'cod_confirm_hours')::int, 24)) <= now()`: đặt `cod_overdue_at = now()` và `core.enqueue(entity_id, 'cod.overdue', 'cod.overdue:' || id, id, jsonb_build_object('orderCode', code))`. Không hủy đơn. Cron `flag-overdue-cod` chạy `*/15 * * * *`.

- [ ] **Step 1: Viết test fail**

```ts
it("G3 COD quá 24 giờ chưa xác nhận: báo vận hành đúng một lần, không hủy đơn", async () => {
  const { variantId } = await seedSku({ onHand: 2 });
  const r = await placeShop(variantId, "cod");
  if (!r.ok) throw new Error(r.error.message);
  await sql(`update commerce.orders set created_at = now() - interval '25 hours' where id = $1`, [r.data.orderId]);
  await sql(`select shop.flag_overdue_cod()`);
  await sql(`select shop.flag_overdue_cod()`);
  expect((await sql<{ n: number }>(`select count(*)::int n from core.outbox where kind = 'cod.overdue' and aggregate_id = $1`, [r.data.orderId]))[0]!.n).toBe(1);
  expect((await sql(`select status, fulfillment_status from commerce.orders where id = $1`, [r.data.orderId]))[0]).toMatchObject({ fulfillment_status: "new" });
});
```

- [ ] **Step 2: Chạy, thấy fail** (hàm chưa có)
- [ ] **Step 3: Viết cột, hàm, cron, renderer, badge**
- [ ] **Step 4: Chạy test và `notify.test.ts`, thấy pass**
- [ ] **Step 5: Commit** `feat: alert operations about unconfirmed cod orders after 24 hours`

---

### Task 18: LT02 khách ký nhận khi nhận phòng (G4)

**Files:**
- Modify: `supabase/migrations/202612010002_frontdesk.sql:103-117` (nhánh `check_in` của `transition_booking`)
- Modify: `packages/api/src/ops.ts:19,25` (`guestAcknowledged?: boolean` vào `TransitionInput` và `p_opts`)
- Modify: `apps/web/src/app/ops/dat-phong/[id]/nhan-phong/page.tsx:39` (checkbox `guestAcknowledged` "Khách đã ký nhận bàn giao phòng (phiếu đăng ký, khóa hoặc mã)"), `apps/web/src/features/ops/actions.ts:70`
- Modify: các chỗ gọi check-in: `tests/integration/review2.test.ts`, `tests/integration/booking-transitions.test.ts`, `tests/e2e/frontdesk.spec.ts`
- Test: `tests/integration/booking-transitions.test.ts` (dùng `confirmedToday` sẵn có)

- [ ] **Step 1: Viết test fail**

`it("LT02: nhận phòng cần khách ký nhận; audit lưu ký nhận, giấy tờ, khóa và giờ giao")`. Dựng booking như test "không nhận phòng bẩn/chưa nghiệm thu…" (phòng `ready`). Check-in với `identityVerified: true` nhưng thiếu `guestAcknowledged` thì `error.code === "VALIDATION"`. Thêm `guestAcknowledged: true, keyHandover: "Chìa P01"` thì ok, và `sql("select diff from core.audit_logs where action = 'booking.check_in' and subject_id = $1")` có `diff.guestAcknowledged === true`, `diff.identityVerified === true`, `diff.key === "Chìa P01"`, `diff.handedAt` khác null.

- [ ] **Step 2: Chạy, thấy fail**
- [ ] **Step 3: Thêm kiểm tra `core.fail('VALIDATION', 'Cần khách ký nhận bàn giao phòng')`; audit diff gồm `key`, `identityVerified`, `guestAcknowledged`, `handedAt = now()`. Cập nhật API, form và các test gọi check-in**
- [ ] **Step 4: Chạy `pnpm test:integration`, `pnpm test:e2e frontdesk`, thấy pass**
- [ ] **Step 5: Commit** `feat: record guest acknowledgement at check-in`

---

### Task 19: Cờ nghi lễ 24 giờ theo từng sản phẩm, sửa seed (S1, S2)

**Files:**
- Modify: `supabase/migrations/202611030003_stay_shop_base.sql:67` (thêm `requires_ritual boolean not null default false` sau `ritual_slug`)
- Modify: `supabase/migrations/202612150003_shop_checkout.sql:120-127` (đọc `pr.requires_ritual` thay cho `ritual_slug is not null`)
- Modify: `supabase/migrations/202612150001_shop.sql:175` (`shop.create_product` nhận `p ->> 'requiresRitual'`)
- Modify: form tạo sản phẩm trong `apps/web/src/app/admin/san-pham/` (checkbox "Cần nghi lễ 24 giờ trước khi giao")
- Modify: `supabase/seed.sql` (sau insert products; dòng 144 comment Giáng sinh)
- Modify: `tests/integration/shop-orders.test.ts:82` (đặt `requires_ritual = true` thay cho `ritual_slug`)
- Test: `tests/integration/review4.test.ts`

- [ ] **Step 1: Viết test fail**

```ts
it("S1 sản phẩm có trang nghi lễ QR nhưng không cần nghi lễ 24h thì đơn không bị giữ", async () => {
  const { productId, variantId } = await seedSku({ onHand: 2 });
  await sql(`update shop.products set ritual_slug = 'nghi-le-thu', requires_ritual = false where id = $1`, [productId]);
  const r = await placeShop(variantId, "cod");
  if (!r.ok) throw new Error(r.error.message);
  expect((await sql(`select ritual_required from commerce.orders where id = $1`, [r.data.orderId]))[0]!.ritual_required).toBe(false);
});
```

- [ ] **Step 2: Chạy, thấy fail** (cột chưa có)
- [ ] **Step 3: Sửa schema, checkout, `create_product`, form; seed thêm:**

```sql
-- Fixture: sản phẩm cần nghi lễ 24h trước khi giao (chọn tạm: đá và combo tâm linh), chờ chủ cơ sở duyệt.
update shop.products set requires_ritual = true
where category_id in (select id from shop.categories where slug in ('da-va-vat-pham','combo-tam-linh'));
```

Comment dòng 144 đổi thành `-- Giáng sinh: đêm 24 và 25/12 (+500.000 đ); daterange nửa mở nên đêm 26 không tính.`

- [ ] **Step 4: Chạy `pnpm db:reset && pnpm test:integration && pnpm test:e2e shop-checkout catalog`, thấy pass**
- [ ] **Step 5: Commit** `fix: gate the 24h ritual hold on a product flag, not on its qr page`

---

### Task 20: Cập nhật artifact "ZSOPO GĐ0" (A)

Chỉ làm sau khi Task 1-19 đã merge. Artifact đang **public**: phải đưa danh sách sửa cho người dùng duyệt trước khi đăng.

**Files:**
- Artifact slug `b095a451-69ea-4ed2-91db-31f2474eb458` (link `https://claude.ai/artifact/NoiQUbkiwZz6C7jimWqkw1`), sửa bằng `mcp__claude-artifacts__edit_version` với `shared_live: "public"`, `artifact_title: "ZSOPO GĐ0"`, `base_version` lấy từ `read_artifact` ngay trước khi sửa.

**Nội dung sửa** (mỗi dòng là một `old_text` → `new_text` trong HTML hoặc mảng `G` của script):

| Vị trí | Sửa thành |
|---|---|
| UC2 "Người thực hiện" | "lễ tân, quản lý điểm hoặc tài chính có quyền xác nhận chuyển khoản (xác thực hai bước). Tiền mặt tại quầy không cần." |
| UC3 bước 2 | giữ "cho khách ký nhận" (đúng sau Task 18), thêm "nhân viên xác nhận trên hệ thống" |
| BP04 | "Dọn khu chung theo lịch ngày, tuần, tháng do quản lý điểm cấu hình" |
| UC1 mockup | ngày `15/12 → 17/12` (Thứ Ba, Thứ Tư), hai dòng "Đêm 15/12", "Đêm 16/12" giữ 1.250.000 đ; mã `ZS-MAU-000123` → `ZS4F9A2C7B1E` |
| UC4 mockup | tên nhóm theo seed: "1 · Vào phòng an toàn", "2 · Thu dọn", "3 · Giường", "4 · Phòng tắm và WC" |
| Breadcrumb mockup | `admin / tong-quan` → `admin`; `ops / bang-phong` → `ops / phong` |
| A3 "đang dùng tạm" | "Giá cơ bản 1.250.000 / 1.450.000 / 2.200.000 / 2.800.000 đ theo loại phòng; cuối tuần (T6, T7) +200.000 đ; Giáng sinh đêm 24 và 25/12 +500.000 đ; phụ thu người lớn 250.000 đ, trẻ em 150.000 đ, trẻ dưới 6 tuổi miễn phí. Số mẫu, chưa duyệt." |
| D2 | "Bản mẫu gán tạm: bữa sáng, xe đón, giặt ủi do ZSOPO phục vụ; thiền chuông xoay do đối tác; giảm khi đặt trước 10% / 5% / 10%. Chưa duyệt." |
| E4 | "Bản mẫu chọn tạm đá và combo tâm linh cần nghi lễ 24 giờ; các sản phẩm khác giao ngay." |
| E5 | "Chuyển khoản 24 giờ (quá hạn tự hủy, nhả hàng). COD quá 24 giờ chưa xác nhận thì báo vận hành, không tự hủy." |
| F3 | "Mẫu checklist có 5 khu (bếp, BBQ, sảnh, sân vườn, hồ bơi), cho phép đánh không áp dụng; chưa cấu hình lịch lặp." |
| F4 | "3 vật tư mẫu: ga giường đôi (tối thiểu 20), khăn tắm (30), trà thảo mộc gói (50)." |
| UC6 bước 4, BP01, UC4 "ảnh" | giữ nguyên (đúng sau Task 1, 9, 15) |

- [ ] **Step 1: `read_artifact`, ghi lại `version`; kiểm từng `old_text` xuất hiện đúng một lần**
- [ ] **Step 2: Gửi người dùng bảng trên cùng `old_text`/`new_text`, chờ duyệt**
- [ ] **Step 3: `edit_version` một lần với toàn bộ edits, `label: "Review 4"`**
- [ ] **Step 4: `read_artifact` lại, xác nhận từng `new_text` có mặt và không còn `ZS-MAU-000123`, `Chưa có giá mùa hay phụ thu`, `tong-quan`, `bang-phong`**

---

## Quyết định mở (chủ dự án)

- Spec 02 ghi "TOTP MFA bắt buộc với Admin/Finance/Super admin". Plan này chỉ bắt MFA cho xác nhận chuyển khoản và các hành động vốn đã là aal2. Bắt MFA cho mọi hành động của `ops_finance` cần đặt `requires_aal2 = true` cho cả role và chuyển mọi test finance sang `aal2ClientFor`/`staffLogin({ mfa: true })`. Làm khi chủ dự án chọn cách đọc chặt.
- Danh sách sản phẩm cần nghi lễ 24h, lịch khu chung, ngưỡng COD: plan dùng giá trị mẫu, chờ vận hành trả lời câu E4, F3, E5 trong artifact.
