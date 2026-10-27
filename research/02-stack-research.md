# Phiên bản và nguồn kỹ thuật online

Kiểm tra ngày 27/10/2026. Snapshot dưới đây lấy trực tiếp npm registry `latest`, đối chiếu tài liệu chính thức. Đây là kết quả nghiên cứu cho plan, chưa phải bộ dependencies đã install/build thành công. `latest` tại ngày triển khai có thể khác; pin exact sau smoke/peer compatibility test, commit lockfile, CI dùng frozen lockfile.

## Snapshot dependency

| Package | Stable latest quan sát | Node engine khai báo | Nguồn |
|---|---|---|---|
| `next` | `16.4.3` | `>=20.9.0` | [registry](https://registry.npmjs.org/next/latest) |
| `react` | `19.3.1` | `>=0.10.0` | [registry](https://registry.npmjs.org/react/latest) |
| `react-dom` | `19.3.1` | `không khai báo` | [registry](https://registry.npmjs.org/react-dom/latest) |
| `typescript` | `7.0.2` | `>=16.20.0` | [registry](https://registry.npmjs.org/typescript/latest) |
| `tailwindcss` | `4.3.3` | `không khai báo` | [registry](https://registry.npmjs.org/tailwindcss/latest) |
| `@tailwindcss/postcss` | `4.3.3` | `không khai báo` | [registry](https://registry.npmjs.org/@tailwindcss/postcss/latest) |
| `shadcn` | `4.22.1` | `>=20.18.1` | [registry](https://registry.npmjs.org/shadcn/latest) |
| `@supabase/supabase-js` | `2.118.0` | `>=22.0.0` | [registry](https://registry.npmjs.org/@supabase/supabase-js/latest) |
| `@supabase/ssr` | `0.12.7` | `không khai báo` | [registry](https://registry.npmjs.org/@supabase/ssr/latest) |
| `supabase` | `2.122.0` | `không khai báo` | [registry](https://registry.npmjs.org/supabase/latest) |
| `pnpm` | `12.15.0` | `>=18` | [registry](https://registry.npmjs.org/pnpm/latest) |
| `turbo` | `2.11.10` | `không khai báo` | [registry](https://registry.npmjs.org/turbo/latest) |
| `zod` | `4.6.7` | `không khai báo` | [registry](https://registry.npmjs.org/zod/latest) |
| `react-hook-form` | `7.91.0` | `>=18.0.0` | [registry](https://registry.npmjs.org/react-hook-form/latest) |
| `@hookform/resolvers` | `6.0.0` | `không khai báo` | [registry](https://registry.npmjs.org/@hookform/resolvers/latest) |
| `@tanstack/react-query` | `5.105.0` | `không khai báo` | [registry](https://registry.npmjs.org/@tanstack/react-query/latest) |
| `next-intl` | `4.14.9` | `không khai báo` | [registry](https://registry.npmjs.org/next-intl/latest) |
| `vitest` | `5.0.5` | `^22.12.0 || ^24.0.0 || >=26.0.0` | [registry](https://registry.npmjs.org/vitest/latest) |
| `@playwright/test` | `1.64.1` | `>=20` | [registry](https://registry.npmjs.org/@playwright/test/latest) |
| `@sentry/nextjs` | `11.9.0` | `>=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0` | [registry](https://registry.npmjs.org/@sentry/nextjs/latest) |
| `posthog-js` | `1.438.24` | `không khai báo` | [registry](https://registry.npmjs.org/posthog-js/latest) |
| `lucide-react` | `1.61.0` | `không khai báo` | [registry](https://registry.npmjs.org/lucide-react/latest) |
| `dexie` | `4.4.7` | `không khai báo` | [registry](https://registry.npmjs.org/dexie/latest) |
| `resend` | `6.34.1` | `>=20` | [registry](https://registry.npmjs.org/resend/latest) |
| `ical.js` | `2.2.1` | `không khai báo` | [registry](https://registry.npmjs.org/ical.js/latest) |
| `ical-generator` | `11.1.2` | `22 || >=24.0.0` | [registry](https://registry.npmjs.org/ical-generator/latest) |

Không cài mọi package chỉ vì có trong bảng. TanStack Query dành cho client realtime/interactive, không thay mọi RSC fetch; Dexie cho queue offline; ical.js/parser ở Edge cần Deno compatibility smoke, ical-generator có thể đặt ở runtime Node hoặc thay generator tương thích đã test; adapter Deno dùng version pin trong import map. shadcn là CLI/source components, không coi `shadcn` như runtime UI package. react/react-dom phải đồng version; coverage plugin theo version Vitest.

`@supabase/supabase-js` yêu cầu Node >=22, Vitest hiện yêu cầu ^22.12 hoặc ^24 hoặc >=26; baseline Node 24 LTS tránh chọn Node 20 chỉ vì Next minimum là 20.9. Kiểm [Node release status](https://nodejs.org/en/about/previous-releases) và host runtime trước chốt patch. next-intl khai báo peer Next 16; React Hook Form/TanStack Query khai báo React 19. TypeScript 7 phải đi qua smoke thực, không suy từ peer range rằng mọi tooling đã chắc chắn chạy.

## Hướng dẫn chính thức và tác động vào spec

| Nguồn | Điều áp dụng |
|---|---|
| [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) | Dùng mẫu with-supabase để đối chiếu wiring; public URL/publishable key; RLS vẫn bắt buộc; giữ monorepo của dự án |
| [Supabase SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) | Browser/server client tách, Proxy refresh cookie, xác minh claims; session/private response không cache chung |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Bật RLS, least privilege, tránh view bypass và test function grants |
| [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) | App Router hiện hành, TS, build pipeline; không đóng băng Next 15 trong PRD |
| [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) | Metadata/canonical/OG/sitemap thay custom client SEO |
| [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps) | Manifest/service worker, test browser; offline queue là logic sản phẩm riêng |
| [Tailwind Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) | Tailwind 4 + PostCSS plugin, CSS theme; không ép config v3 vào stack mới |
| [shadcn Next.js](https://ui.shadcn.com/docs/installation/next) | Init đúng project, component source, map ZSOPO token/aliases trong workspace |
| [pgsodium deprecation](https://supabase.com/docs/guides/database/extensions/pgsodium) | Không bắt đầu mới bằng pgsodium; thay bằng thiết kế mã hóa được test, Vault cho secrets |
| [Supabase backups](https://supabase.com/docs/guides/platform/backups) | PITR add-on riêng, điều kiện compute; backup objects riêng; kiểm restore |
| [Postgres ranges](https://www.postgresql.org/docs/current/rangetypes.html) | Range bounds và exclusion cùng bảng; thiết kế allocation chung là quyết định kỹ thuật của dự án |
| [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) | SEO fundamentals vẫn áp dụng, HTML text/links/schema khớp UI; không có AI schema bắt buộc |
| [llms.txt proposal](https://llmstxt.org/) | Tệp bổ sung public knowledge links; không cam kết ranking/indexing |

## Quy trình refresh khi bắt đầu implementation

```bash
pnpm view next version engines peerDependencies --json
pnpm view react version --json
pnpm view react-dom version peerDependencies --json
pnpm view typescript version --json
pnpm view tailwindcss version --json
pnpm view shadcn version engines --json
pnpm view @supabase/supabase-js version engines --json
pnpm view @supabase/ssr version peerDependencies --json
pnpm view vitest version engines --json
```

Lưu snapshot cả dependency được chọn, pin trực tiếp và pin CLI local. Chạy frozen install, lint/typecheck, Next build, SSR session smoke, shadcn dialog/form, Supabase local RPC/RLS, Vitest/Playwright. Chỉ sau đó ghi “stack đã kiểm chứng”. Dùng Dependabot/renovation theo PR nhỏ, security fix ưu tiên; không upgrade không kiểm soát giữa release money workflow.
