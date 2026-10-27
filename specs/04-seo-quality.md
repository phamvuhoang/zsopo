# SEO, LLMO, hiệu năng và cổng chất lượng

## 1. SEO kỹ thuật

- Public content cần đọc được từ HTML đầu tiên: bài viết, giá/đặc tính phòng, sản phẩm, chính sách, địa chỉ/liên hệ. SSR/ISR theo nội dung; calendar/checkout luôn lấy tồn/giá mới. Không fetch toàn bộ trang chỉ sau hydration.
- `generateMetadata`: title unique, description, canonical tuyệt đối từ SITE_URL, OG/Twitter image, robots. Dùng [Metadata API của Next.js](https://nextjs.org/docs/app/getting-started/metadata-and-og-images). Không lấy host không tin cậy từ request để tạo canonical.
- URL tiếng Việt không dấu, slug duy nhất; đổi slug redirect 301; page xóa 404/410 có chủ đích. Search/filter query noindex và canonical route gốc phù hợp; category có nội dung biên tập được index. Pagination có URL riêng và self-canonical, không canonical toàn bộ trang 2 về trang 1.
- `sitemap.ts`: chỉ published/canonical public pages và lastmod theo thay đổi nội dung thật; không private/draft/receipt/search params. Chia sitemap khi lớn, không cần làm sớm cho vài chục SKU. robots không thay thế auth; preview/staging dùng access protection + noindex.
- Private auth/ops/admin/cart/checkout/order/booking cá nhân/handbook riêng/ical token: noindex, no-store và authorization. Không lộ token trong sitemap, metadata, analytics hoặc referrer. Public handbook chỉ phần cơ sở đã duyệt.
- JSON-LD: Organization/WebSite/BreadcrumbList; Article cho bài; LodgingBusiness + accommodation phù hợp cho điểm/phòng; Product/Offer/availability cho SKU thực. Chưa có Course/Event/Person chuyên gia khi module chưa mở. Không bịa aggregateRating/review/stock/address. Escape `<` trong JSON serialization để chống script injection; schema phản ánh phần người dùng thấy.
- Sitemap và structured data đổi khi publish/unpublish/product availability thay đổi; invalidate cache theo entity/slug/tag, không purge toàn site mọi lần.

## 2. LLMO thực dụng

Mục tiêu là nội dung có thể thu thập, hiểu và trích dẫn chính xác. Không cam kết xếp hạng hoặc được LLM nhắc tên. Google nói SEO thông thường vẫn phù hợp cho AI features, không cần markup AI đặc biệt. [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features).

1. Trang có đoạn trả lời trực tiếp “ZSOPO là gì”, vị trí Zen, cách đặt/cọc/hủy, giờ nhận/trả, tiện nghi và nguồn gốc/cách dùng sản phẩm; tiêu đề rõ, bảng thông tin và FAQ hữu ích bằng HTML semantic.
2. Tên pháp nhân/thương hiệu/địa điểm nhất quán; tác giả/người biên tập, ngày cập nhật, nguồn dẫn và giới hạn diễn giải của bảng năng lượng. Không gọi cảm nhận hay Bovis là bằng chứng y khoa.
3. Liên kết nội bộ blog -> phòng/product/chính sách bằng anchor cụ thể; breadcrumb, URL ổn định. Không giấu câu trả lời chỉ trong ảnh/video.
4. Tạo `/llms.txt` ngắn từ nội dung public đã publish: giới thiệu, đường dẫn chủ chốt, chính sách, thời điểm cập nhật. Đây là bổ sung theo [đề xuất llms.txt](https://llmstxt.org/), không phải điều kiện SEO hay bằng chứng được index. Không đưa private data hoặc toàn bộ tài liệu nội bộ vào file này.
5. Nếu thêm bản Markdown `/noi-dung/[slug].md`, chỉ từ cùng source published, có canonical về HTML; không tạo bộ nội dung khác riêng cho bot. GĐ0 không bắt buộc endpoint Markdown này vì HTML/llms.txt đã đủ deliverable.
6. robots/crawler policy tách quyền tìm kiếm và huấn luyện theo quyết định chủ nội dung; không mặc định chặn mọi AI crawler rồi tuyên bố đã tối ưu LLMO. Kiểm host/WAF không chặn fetch public không JS.
7. Đo Search Console/indexing, organic conversion, referral có nguồn xác định và mẫu câu trả lời kiểm thủ công định kỳ; không diễn giải thiếu referral là không có ảnh hưởng AI.

Acceptance LLMO: request không JS lấy được tên/địa chỉ đã duyệt/giờ/chính sách/giá nguồn, llms.txt chỉ có link public 200, JSON-LD khớp UI, không có PII/draft trong response/sitemap. Bộ 10 câu hỏi QA về cơ sở/đặt/hủy/ship/energy trả lời được từ đoạn public có URL nguồn.

## 3. Cache và performance budget

| Bề mặt | Chính sách |
|---|---|
| Blog/pages | ISR đề xuất 1 giờ + invalidate ngay sau publish; scheduled job invalidate theo version |
| Catalog/room descriptions | ISR đề xuất 5 phút + event invalidation; tách availability/quote uncached |
| Public price/stock display | Giá “từ” có context; Offer revalidate khi đổi giá/tồn; checkout xác minh lại |
| Search | Bounded query/pagination, debounce; GIN unaccent tsvector, optional trigram fallback; max query length |
| Ops/admin/private | Dynamic, private/no-store, key cache client chứa user/entity/location |
| iCal | Export token, tối đa cache ngắn nội bộ nếu đúng scope; invalidation khi lịch đổi |

Mục tiêu PRD giữ nguyên: LCP <2,5s 4G; TTFB <300ms từ Việt Nam; API p95 <400ms; realtime <2s; uptime 99,5%. Bổ sung INP ≤200ms, CLS ≤0,1 ở p75 khi có đủ RUM. Lighthouse lab median 3 lần trên 5 template public: Performance ≥85, SEO ≥95, Accessibility ≥90. Báo riêng cold/warm response và external-provider latency, không che cold start bằng cache-only benchmark.

Ngân sách đề xuất: JS public ban đầu ≤180KB gzip không kể media, ảnh hero đúng kích thước ưu tiên tải, gallery dưới fold lazy; video intro poster + tải khi click, không autoplay 17MB trên mobile. Charts/markdown editor/QR/PWA libraries lazy theo route. Query list paginate 20-50 records, index theo truy vấn, không N+1. Báo vượt budget và sửa trước mở bán nếu chạm ngưỡng PRD.

## 4. Test strategy

| Lớp | Bộ kiểm tra bắt buộc |
|---|---|
| Core Vitest | nightly price precedence, VND rounding/discount/deposit, occupancy/ADR, state transitions; ≥90% lines; fixed clocks/timezone |
| pgTAP | Mỗi bảng RLS; function privilege; owner/staff/other entity/other location; cannot edit ledger/payment/role; revoke immediately; public projection |
| Integration | Parallel last-room/last-SKU, payment duplicate/late/under/over, transaction rollback/outbox, iCal last-good/conflict/UID/recur/date, delete TTL, job retry |
| Playwright money GĐ0 | Stay guest VietQR manual; shop COD; shop bank; thay đổi/hủy/hoàn thủ công đúng quyền. Không giả chạy LMS/consult/subscription/donation GĐ2 |
| Playwright Ops | LT01-LT05; BP01-BP05 + BM01-BM04; offline/restart/reconnect/conflict; QR service realtime |
| SEO/a11y | JS off HTML, metadata/canonical/schema, sitemap no leak, llms links, keyboard/focus labels/live alerts/contrast/dark/zoom, axe |
| Operational | Restore drill, rotate token/key, disable staff, incident iCal/mail/payment, 7-day UAT evidence |

Core test không thể thay concurrency DB test. Visual test không thể thay nghiệp vụ. Tài liệu SOP 11 bước phải còn đủ kiểm soát dù UI gom 7 nhóm.

## 5. Release gates theo sprint

S0: CI build và RLS xanh, local setup tái lập, staging, roles/invite/MFA, secrets không lộ, seed 13/9, quan sát hoạt động. Đưa nội quy/bảo mật/terms tối thiểu từ S3 lên S0-S1 vì S1 đã thu dữ liệu và tiền.

S1: F1 guest booking + concurrent room test, iCal import/export/failure, manual receipt/payment, email + Zalo nếu đã provision, handbook; UAT 3 booking thật có quản lý xác nhận. Zalo chưa có thì ghi rõ release deviation dùng email, không coi hai kênh đều đã pass.

S2: Ops PWA theo SOP, QR service, housekeeping offline/ảnh/conflict, TTL docs, roles, BM forms; nhân viên dùng một tuần, ≥90% ca hoàn thành checklist. Không tính checklist chưa sync là đã hoàn thành server.

S3: ≥20 SKU được chủ nội dung duyệt, F2 COD/bank/ritual, CMS và search, CRM/campaign, dashboard 5 nguồn reconcile; đơn thật đầu tiên; Lighthouse/SEO pass.

Mỗi release: tất cả MUST tương ứng pass; pháp lý/nội dung chính sách được người có trách nhiệm duyệt; backup phục hồi thành công trong 30 ngày; Sentry/PostHog/jobs health active; runbook và contact trực 48h; đào tạo video 10 phút + checklist thực hành; migration dry-run và rollback đã thử. Không mở bán nếu còn lỗi double booking, âm tồn, truy cập chéo, ghi tiền lặp hoặc không khôi phục được dữ liệu.

## 6. Quan sát, analytics và sự cố

PostHog events GĐ0: `page_view`, `room_viewed`, `booking_started`, `booking_paid`, `service_prebooked`, `product_viewed`, `add_to_cart`, `order_placed`, `order_paid`; signup khi account thật được xác minh. Kèm entity/location/source/utm khi có; dedupe server-side cho paid; không gửi email/phone/note/giấy tờ/token. Mask form, tắt session replay ở auth/payment/ops/admin và mọi nội dung nhạy cảm.

Sentry redaction breadcrumbs/query strings/headers; correlation ID nối UI/Edge/DB job. Cảnh báo lỗi >1%/5 phút, iCal fail 2 lần, outbox quá hạn, pending payment, queue conflict nhiều, purge docs thất bại. Status page từ health data đã lọc, không proxy dashboard nhà cung cấp.

Runbook tối thiểu: (1) OTA lỗi -> giữ last-good, khóa bán/đối chiếu thủ công, reconcile khi phục hồi; (2) tiền treo -> giữ evidence, idempotency lookup, finance đối soát, không resend write mù; (3) restore -> maintenance, restore isolated, tombstone purge, reconcile payments, promote; (4) lộ token/key -> revoke/rotate, audit access, reissue scoped sessions; (5) outbox fail -> sửa provider, replay theo key, theo dõi duplicate; (6) offline conflict -> bảo toàn draft, kiểm phân công/version, manager xử lý.
