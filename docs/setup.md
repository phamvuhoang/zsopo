# Thiết lập môi trường phát triển

## Yêu cầu

- Node 24 LTS (`.nvmrc`, engines `>=24.11`). Đã chạy được trên Node 26.
- pnpm 12.15.0 (`packageManager`). Corepack cũ (bản đi kèm Homebrew trước 0.34) không tải được pnpm 12 và báo `Cannot find module .../pnpm.cjs`. Cách xử lý: `npm i -g corepack@latest && corepack enable`, hoặc chạy `npx pnpm@12.15.0 <lệnh>`.
- Docker đang chạy (Supabase local).

## Lệnh

```bash
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local     # điền NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY từ `pnpm exec supabase status`
pnpm exec supabase start                # ports 564xx, không đụng project Supabase local khác
pnpm db:reset                           # migrations + seed giả (13 phòng, 9 bán)
pnpm dev                                # http://localhost:3000
```

Kiểm tra: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:db`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `pnpm check:rls`, `pnpm check:types`, `pnpm check:seed`.

Thiếu biến môi trường thì app dừng ngay lúc boot với danh sách biến thiếu (`packages/core/src/env.ts`). Biến có chữ `secret`/`service_role` ở publishable key bị từ chối.

## Triển khai (checklist, chưa provision)

Production chỉ được coi là đã provision khi có tài khoản, domain và người duyệt thật.

- [ ] Supabase staging + production riêng (Singapore). Secrets Edge: `RESEND_API_KEY`, `ZALO_*` (nếu có OA), `DOC_ENCRYPTION_KEYS`, `SUPABASE_SERVICE_ROLE_KEY` chỉ trong Edge.
- [ ] Vercel project, root `apps/web`, region `sin1`; preview có Deployment Protection, env `NEXT_PUBLIC_*` theo môi trường.
- [ ] GitHub environments `staging`/`production`: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`, var `SUPABASE_PROJECT_REF`.
- [ ] SMTP/Resend DNS (SPF/DKIM), Google OAuth client, Sentry/PostHog project (chưa gắn SDK cho tới khi có DSN và chính sách consent được duyệt).
- [ ] PITR add-on, storage backup, key custody cho giấy tờ: xem `docs/runbooks/`.
