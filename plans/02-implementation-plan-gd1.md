# ZSOPO GĐ1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ dùng subagent-driven-development nếu người dùng cho phép cách thực hiện đó. Ghi ruling mới vào `docs/implementation-rulings.md` theo đúng định dạng GĐ0.

**Goal:** Phát hành mặt tiền Connect (hồ sơ năng lượng, LMS miễn phí, chuyên gia, sự kiện miễn phí, cộng đồng v1, landing/lead magnet, chuỗi chăm sóc) trên codebase GĐ0, đúng các story MUST GĐ1 và DoD S4-S8.

**Architecture:** Cùng app Next.js 16 và Supabase; năm schema mới `energy/learn/expert/events/community`; mọi nghiệp vụ là SQL SECURITY DEFINER RPC gọi qua `packages/api` `call()`; outbox/sequence cho thông báo; member là chủ dữ liệu qua RLS, không có staff policy trên dữ liệu nhạy cảm.

**Tech Stack:** như GĐ0 (`research/02-stack-research.md`, versions đã pin trong lockfile) cộng `pdf-lib` + `@pdf-lib/fontkit` (chứng nhận) và `posthog-js` + `posthog-node` (chỉ khi có key và consent). Không thêm player/chart/editor library.

**Spec:** `../specs/05-product-gd1.md`, `../specs/06-architecture-gd1.md`; nền: `../specs/01-product-gd0.md`, `../specs/02-architecture.md`, `../specs/04-seo-quality.md`, `../docs/implementation-rulings.md`.

## Global Constraints

- Giữ nguyên Global Constraints của `01-implementation-plan.md` (pin exact, service role chỉ Edge, bigint VND, RLS mọi bảng, tiếng Việt có dấu, không em dash, không lời hứa y khoa, không số liệu demo production).
- Dữ liệu nhạy cảm (`energy.*`, câu trả lời quiz, ghi chú, chứng chỉ gốc) không có staff policy, không vào analytics/audit diff/CSV.
- `courses.price` và `events.price` phải bằng 0 để publish trong GĐ1; không tạo `commerce.orders` cho giao dịch 0 đồng.
- Mọi thao tác ghi của member yêu cầu email đã xác minh (`EMAIL_UNVERIFIED`).
- Thêm schema mới vào `supabase/config.toml`, `db:types`, `check-rls.mjs`, `check-types.mjs` ngay trong task tạo schema; `pnpm check:rls` phải xanh sau mỗi migration.
- Số liệu điểm, rubric, bộ câu hỏi, 4 khóa là fixture cho local/staging; `seed-validate --production` từ chối nội dung placeholder và khóa demo Vault.
- Mỗi task một commit sau khi test xanh; giữ `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:db && pnpm test:integration && pnpm build` xanh trước commit (chạy từng lệnh một dòng, không `&&` dưới `set -e`, theo ruling Final GĐ0).

## Review Focus

1. Người dùng chưa xác minh email bấm "Ghi danh"/"Đăng ký sự kiện"/"Đăng bài": phải nhận `EMAIL_UNVERIFIED` với nút gửi lại email, không tạo bản ghi. Test ở T21 (enroll), T25 (register), T26 (post).
2. Bộ câu hỏi quiz đổi version khi người dùng đang làm dở: nộp với `quizVersion` cũ vẫn chấm theo version đó nếu `retired_at` dưới 24 giờ, sau đó trả `VERSION_CONFLICT` yêu cầu làm lại. Test ở T20.
3. Hoàn thành bài cuối từ hai tab cùng lúc: một chứng nhận, một dòng điểm hoàn thành khóa, một email. Test ở T22.
4. Sự kiện bị đổi giờ sau khi đã enqueue nhắc 24h: tin nhắc render tại giờ gửi phải dùng giờ mới hoặc bỏ qua nếu đã hủy; không gửi giờ cũ. Test ở T25.
5. Lead landing với email trùng khách đã có tài khoản: không gắn lead vào tài khoản đó, không gửi email có link ghi danh tự động vào tài khoản người khác; chỉ gợi ý gộp trong CRM. Test ở T27.

## 1. Sprint, phụ thuộc và năng lực

| Sprint PRD | Task | Deliverable | Gate thực địa |
|---|---|---|---|
| S4 05-16/01/2027 | T20 | Member area, hồ sơ năng lượng, check-in, admin quiz, báo cáo ẩn danh | 100 hồ sơ thật |
| S5 19/01-13/02 | T21, T22 | LMS v1: khóa/bài/ghi danh/tiến độ/drip; quiz, chứng nhận, điểm, huy hiệu, challenge, xếp hạng | 4 khóa có nội dung thật |
| S6 16-27/02 | T23 | Chuỗi email/Zalo, thông báo in-app, cài đặt kênh | Challenge ≥500 người, giờ học ghi nhận |
| S7 02-13/03 | T24, T25 | Ứng tuyển/chấm điểm/hồ sơ/danh bạ; sự kiện/đăng ký/nhắc/QR check-in/chờ | 30 ứng tuyển, 10 công khai, 2 workshop |
| S8 16-26/03 | T26, T27, T28 | Cộng đồng + cây tâm nguyện; landing + lead magnet; hardening, SEO, dashboard, CRM, UAT, release | Phát hành 27/03, 2.000 đăng ký |

Critical path: T20 -> T21 -> T22 -> T23 -> T25 -> T28. T24 độc lập sau T20; T26 cần T21/T25 (nhóm tự động); T27 cần T23 (sequence) và T21 (quà mini-course). Ước lượng 55-70 engineer-days cho 12 tuần với một người là sát; nếu chưa có dev thứ hai từ 01/2027, giữ MUST và cắt theo thứ tự: W-58 xếp hạng, cây tâm nguyện, countdown/testimonials block, `/toi/don-hang` (đã có receipt), báo cáo ẩn danh W-130.

## 2. Quy ước

Như GĐ0 mục 2: viết test fail trước, implement nhỏ, chạy lại, commit. Helper mới trong `tests/integration/helpers.ts`: `memberClient(n)` tạo và đăng nhập member đã xác minh email (`auth.users.email_confirmed_at`) với id `b0000000-0000-4000-8000-0000000000NN`; `unverifiedMember()`; `expertClient()` sau khi T24 cấp role. Fixture GĐ1 trong `supabase/seed.sql`: quiz v1 12 câu, 4 khóa khung (1 khóa có 3 bài thật để test), 1 cohort challenge, 2 discipline đủ câu hỏi, rubric v1, 2 sự kiện (1 online, 1 tại Đà Lạt), 1 nhóm công khai, 1 landing.

## T20. Member area, hồ sơ năng lượng và check-in cảm xúc

**Phụ thuộc:** GĐ0 hoàn tất. **Ước lượng:** 6-7 ngày.

**Files tạo:** `supabase/migrations/202701050001_members_energy.sql`, `packages/core/src/energy/{score,score.test}.ts`, `packages/api/src/energy.ts`, `apps/web/src/app/(member)/layout.tsx`, `(member)/toi/{page,nhat-ky/page,cai-dat/page}.tsx`, `(member)/ho-so-nang-luong/{page,quiz/page,ket-qua/page}.tsx`, `apps/web/src/features/energy/{actions,queries,quiz-form,profile-card,chakra-figure,checkin}.tsx`, `apps/web/src/app/admin/ho-so-nang-luong/page.tsx`, `apps/web/src/app/admin/quyen-rieng-tu/page.tsx`, `supabase/functions/account-delete/index.ts`, `supabase/tests/database/energy_rls.test.sql`, `tests/integration/energy.test.ts`, `tests/e2e/energy-profile.spec.ts`.

**Files sửa:** `supabase/config.toml` (schemas), `package.json` (`db:types`), `scripts/{check-rls,check-types}.mjs`, `packages/core/src/contracts/index.ts` (types mục 3 spec 06, ERROR_CODES mới), `packages/api/src/rpc.ts` (copy lỗi mới), `packages/core/src/index.ts`, `apps/web/src/lib/flags.ts` (`energy`), `apps/web/src/components/site-header.tsx` (nút Tôi khi đăng nhập), `tests/integration/helpers.ts` (memberClient), `supabase/seed.sql`, `docs/runbooks/keys.md` (energy_answers_key).

**Interfaces:**
- Produces: `scoreQuiz(def: QuizDefinition, answers: QuizAnswer[]): Omit<EnergyResult,'actions'>` (pure, dùng cả client "làm thử" và parity test với SQL); `recommend(rules, result, catalog): EnergyResult['actions']`.
- RPC: `energy.active_quiz()` (public projection không có weights), `energy.submit_quiz(p_version int, p_answers jsonb, p_consents jsonb, p_goals text[]) -> EnergyResult`, `energy.my_profile() -> jsonb|null`, `energy.delete_my_profile(p_delete_checkins bool)`, `energy.checkin(...)`, `energy.my_checkins(p_from date, p_to date)`, `energy.report(p_from, p_to)`, `energy.save_quiz_definition(jsonb) -> version`, `energy.activate_quiz(version)`, `core.request_privacy(kind)`, `core.cancel_privacy_request(id)`.
- Member layout cung cấp `getMemberContext()` trong `apps/web/src/lib/auth/member.ts`: `{userId, email, emailVerified, displayName}`; redirect `/dang-nhap` khi chưa đăng nhập.

- [ ] Viết unit `score.test.ts`: fixture 12 câu, bộ trả lời cho ra `conscious_seeker` với low chakras `['throat','solar']`; trả lời rỗng -> persona mặc định `seeking_healing` và chakraScores 50; recommend bỏ dòng trỏ slug chưa published và trả đúng 3 dòng.
- [ ] Viết pgTAP `energy_rls.test.sql`: member A `select` `energy.profiles` chỉ thấy dòng mình; super_admin `select energy.profiles` -> 42501; anon gọi `energy.submit_quiz` -> 42501; `energy.report` với n < 20 trả mảng rỗng.
- [ ] Viết integration `energy.test.ts`: submit không consent -> `CONSENT_REQUIRED`; submit với member chưa xác minh -> `EMAIL_UNVERIFIED`; submit ok -> `my_profile` trả persona, `answers` giải mã bằng chính chủ; cột `answers_enc` trong DB không chứa chuỗi câu trả lời (`sql` kiểm `position(... in encode(answers_enc,'escape')) = 0`); version mới activate rồi submit version cũ sau 24h -> `VERSION_CONFLICT` (dùng `set local` thời gian qua cột `retired_at` fixture); delete xóa cứng và audit chỉ có metadata; checkin 31 lần/ngày -> `RATE_LIMITED`.
- [ ] Chạy `pnpm test:unit`, `pnpm test:db`, `pnpm test:integration energy` thấy fail đúng lý do (schema/function chưa có).
- [ ] Migration: schema `energy`, bảng mục 1 spec 06, consent purposes mới (`alter` check constraint `consent_records.purpose`), Vault secret `energy_answers_key` seed local, RPC trên với `core.fail`, `core.rate_limit('energy.checkin:'||auth.uid(), 30, '1 day')`, policies owner-only, grants; `core.notifications`, `core.notification_prefs`, `core.privacy_requests` thêm `user_id`, `core.deleted_accounts`, `role_permissions` thêm `energy.manage`, `energy.report`, `privacy.process`. Cập nhật config/scripts/types.
- [ ] Implement `score.ts` và trigger parity: `energy.submit_quiz` tính điểm trong SQL theo cùng thuật toán; integration test so sánh với `scoreQuiz` trên 3 bộ trả lời fixture.
- [ ] UI: `(member)` layout với nav Tôi; `/ho-so-nang-luong` (W-38 đồng ý, lấy văn bản từ CMS page `dong-y-du-lieu-nhay-cam`, chưa published thì chỉ có "Làm thử không lưu"); quiz một câu một màn, 4 dạng, thanh tiến độ, lưu nháp trong `sessionStorage`; kết quả W-40 với Energy Profile Card, SVG 7 luân xa, 3 hành động, toggle chia sẻ, làm lại, xóa (confirm gõ XOA); `/toi` W-41 với check-in hôm nay, hồ sơ, gợi ý; `/toi/nhat-ky` W-42 biểu đồ tuần SVG; `/toi/cai-dat` W-50 phần thông tin, mật khẩu, quyền riêng tư (chia sẻ hồ sơ, xuất/xóa dữ liệu, xóa tài khoản 72 giờ có hủy).
- [ ] Admin W-130: danh sách version, editor JSON có validate Zod + preview câu hỏi, activate với confirm, báo cáo ẩn danh (persona %, cảm xúc theo tháng). `/admin/quyen-rieng-tu`: hàng đợi `privacy_requests` với hạn 72 giờ, đánh dấu xử lý, tải export (CSV sinh server từ dữ liệu người đó, không gồm hồ sơ năng lượng của người khác). Edge `account-delete`: claim yêu cầu `deletion` quá 72 giờ chưa hủy, xóa auth user qua admin API, ẩn danh profile/customer, ghi tombstone; test integration gọi Edge với yêu cầu fixture.
- [ ] E2E `energy-profile.spec.ts`: đăng nhập member seed, đồng ý, làm 12 câu, thấy persona, bật chia sẻ, xóa hồ sơ, `/toi` báo chưa có hồ sơ; chế độ làm thử không tạo dòng DB (kiểm qua `sql`).
- [ ] Chạy unit/db/integration/e2e/build; commit `feat: add member area and consented energy profile`.

**Done:** không staff nào đọc được hồ sơ cá nhân (pgTAP), xóa thật sự, làm thử không lưu, report chỉ tổng hợp; CTA gợi ý chỉ tới nội dung đã published.

## T21. LMS v1: khóa, bài, ghi danh, tiến độ, drip

**Phụ thuộc:** T20. **Ước lượng:** 7-8 ngày.

**Files tạo:** `supabase/migrations/202701190001_learn.sql`, `packages/core/src/learn/{drip,drip.test,progress,progress.test}.ts`, `packages/api/src/learn.ts`, `apps/web/src/app/(public)/learn/{page,khoa-hoc/page,[slug]/page}.tsx`, `apps/web/src/app/(member)/learn/[slug]/bai/[lesson]/page.tsx`, `(member)/toi/khoa-hoc/page.tsx`, `apps/web/src/features/learn/{queries,actions,player-video,player-audio,lesson-nav,heartbeat}.tsx`, `apps/web/src/app/admin/khoa-hoc/{page,[id]/page}.tsx`, `apps/web/src/app/api/learn/audio/route.ts` (signed URL sau kiểm quyền), `supabase/tests/database/learn_rls.test.sql`, `tests/integration/learn.test.ts`, `tests/e2e/learn.spec.ts`.

**Files sửa:** `flags.ts` (`learn`), `site-header.tsx`, `lib/seo/public-routes.ts`, `lib/seo/json-ld.tsx` (Course), `supabase/migrations` search_public kinds (migration mới, không sửa file cũ), `seed.sql`, `scripts/seed-validate.mjs` (từ chối bài placeholder).

**Interfaces:**
- Produces: `lessonAvailableAt(startDate: string, dripDay: number, tz = 'Asia/Ho_Chi_Minh'): string` (06:00 ngày `start + dripDay`); `courseProgress(lessons: {required: boolean; status: string}[]): number` (%).
- RPC: `learn.enroll_free(p_slug)`, `learn.my_enrollments()`, `learn.course_outline(p_slug) -> LessonPublic[]` (kèm trạng thái theo người gọi, anon thấy `locked` trừ `is_preview`), `learn.lesson_content(p_lesson) -> jsonb` (từ chối `LESSON_LOCKED`), `learn.heartbeat(p_lesson, p_idem)`, `learn.complete_lesson(p_lesson)`, `learn.save_course(jsonb) / publish_course(p_id, p_expected_version)`, `learn.audio_path(p_lesson) -> text` (owner, mở). T22 thêm quiz/assignment/certificate lên cùng bảng.

- [ ] Unit `drip.test.ts`: `lessonAvailableAt('2027-01-19', 0)` = `2027-01-19T06:00:00+07:00`; dripDay 3 đúng ngày; `courseProgress` bỏ bài không bắt buộc.
- [ ] pgTAP `learn_rls.test.sql`: anon đọc `courses` chỉ `published`; member đọc `enrollments` chỉ của mình; editor không đọc `lesson_progress`; `lessons.content` của quiz qua `lesson_content` không có khóa `correct`.
- [ ] Integration `learn.test.ts`: enroll chưa xác minh -> `EMAIL_UNVERIFIED`; enroll khóa `price > 0` -> `VALIDATION`; enroll hai lần idempotent (một dòng); `lesson_content` bài drip_day 1 ngay sau ghi danh -> `LESSON_LOCKED`; `heartbeat` cùng idem hai lần cộng một lần, heartbeat 100 lần liên tục trong 1 giây vẫn ≤ 45 giây/lần; `publish_course` với bài video URL không phải YouTube -> `VALIDATION`; `audio_path` của người chưa ghi danh -> `FORBIDDEN`.
- [ ] Chạy fail; migration schema `learn` (courses, sections, lessons, enrollments, lesson_progress, heartbeats, cohorts), trigger `validate_lesson`, RPC, policies, buckets `learn-media`/`learn-submissions`, `role_permissions` `course.manage/course.publish`, search_public v2 thêm kind `course`.
- [ ] Admin W-123 phần soạn khóa nội bộ: form khóa (Energy Card chọn từ `core.energy_cards`), chương/bài kéo thả thứ tự (native drag hoặc nút lên/xuống), editor Markdown dùng lại CMS, upload audio, quiz editor (câu hỏi + đáp án đúng), publish với checklist (giá 0, mọi bài hợp lệ, có cover alt, disclaimer).
- [ ] Public W-51/52/53 với `'use cache'` + tag `course:<slug>`, JSON-LD Course (không rating), filter chủ đề/cấp/hình thức, disclaimer; nút "Ghi danh miễn phí" dẫn đăng nhập khi cần; sau ghi danh hiện "Bài 1 mở ngay, bài 2 mở 06:00 ngày mai".
- [ ] Player W-54: layout bài + danh sách bài có trạng thái locked/available/completed; video island YouTube IFrame API đo ≥80%; audio `<audio>` với URL từ `/api/learn/audio?lesson=` (signed 1 giờ); text Markdown; heartbeat 30 giây chỉ khi tab visible; nút hoàn thành; `/toi/khoa-hoc` W-43 phần khóa.
- [ ] E2E `learn.spec.ts`: member ghi danh khóa seed, học bài 1 text hoàn thành, bài 2 hiển thị khóa với giờ mở; anon thấy trang khóa không JS có mục lục và disclaimer.
- [ ] Chạy tất cả; commit `feat: add free lms with drip and learning time`.

**Done:** tiến độ và giờ học ghi nhận đúng, drip chặn ở server, nội dung quiz không lộ đáp án, trang khóa index được.

## T22. Quiz, bài tập, chứng nhận, điểm, huy hiệu, challenge, xếp hạng

**Phụ thuộc:** T21. **Ước lượng:** 6-7 ngày.

**Files tạo:** `supabase/migrations/202702020001_learn_progression.sql`, `packages/core/src/learn/{streak,streak.test,points,points.test}.ts`, `apps/web/src/app/(member)/learn/[slug]/hoan-thanh/page.tsx`, `(public)/cert/[code]/page.tsx`, `(public)/learn/{challenge/[cohort]/page,bang-xep-hang/page,lo-trinh/page}.tsx`, `(member)/toi/chung-nhan/page.tsx`, `apps/web/src/app/api/learn/certificate/[code]/route.ts`, `apps/web/src/lib/pdf/certificate.ts`, `apps/web/src/assets/fonts/BeVietnamPro-Regular.ttf` (+ `PROVENANCE.md`), `apps/web/src/features/learn/{quiz-form,assignment-form,leaderboard}.tsx`, `apps/web/src/app/admin/khoa-hoc/bai-tap/page.tsx`, `tests/integration/learn-progression.test.ts`, `tests/e2e/challenge.spec.ts`.

**Files sửa:** `packages/api/src/learn.ts`, `apps/web/package.json` (pdf-lib, @pdf-lib/fontkit), `runtime_settings` seed `points.rules`, `(member)/toi/page.tsx` (điểm, huy hiệu, streak), `features/learn/player` (quiz/assignment kinds), `seed.sql` (cohort).

**Interfaces:**
- Produces: `streak(days: string[], today: string, graceDays = 1): {current: number; usedGrace: boolean}`; `pointsFor(rule: 'enroll'|'lesson'|'course'|'challenge', rules): number`.
- RPC: `learn.submit_quiz(p_lesson, p_answers) -> {scorePct, passed, attemptNo, attemptsLeft}`, `learn.submit_assignment(p_lesson, p_body, p_media)`, `learn.review_assignment(p_id, p_feedback)`, `learn.issue_certificate(p_enrollment) -> code` (idempotent), `learn.revoke_certificate(p_code, p_reason)`, `learn.verify_certificate(p_code) -> jsonb` (anon), `learn.award_points(p_user, p_kind, p_source_type, p_source_id)` (internal, unique nguồn), `learn.leaderboard(p_cohort, p_week_start)`, `learn.my_streak(p_cohort)`, `learn.pathway()` (dùng recommendation_rules của T20).

- [ ] Unit: streak 7 ngày liên tục = 7; thiếu một ngày giữa với grace -> vẫn liền, `usedGrace = true`; thiếu hai ngày -> gãy. `pointsFor` đọc fixture 50/10/150/100.
- [ ] Integration: quiz sai đáp án -> `passed=false`, lần 3 với `quiz_max_attempts=2` -> `ATTEMPTS_EXHAUSTED`; quiz đúng -> bài completed; hoàn thành bài cuối từ hai client song song (`Promise.all`) -> đúng một `certificates`, một `point_transactions kind=earn source=course`, một outbox `course.completed`; `verify_certificate` sau `revoke` trả `revoked`; `verify_certificate` không chứa email; leaderboard không chứa user có `leaderboard_visible=false`; member chỉ `select` `point_transactions` của mình và không `insert` được.
- [ ] Chạy fail; migration: quiz_attempts, assignments, certificates (sequence mã theo tháng), badges/user_badges, `commerce.point_transactions` append-only, `profiles.leaderboard_visible`, cohorts gắn enrollment, RPC trên, trigger `complete_lesson` -> kiểm 100% -> issue certificate + award + badge trong cùng transaction với `pg_advisory_xact_lock(hashtext(enrollment_id))`.
- [ ] PDF: `renderCertificate(snapshot): Promise<Uint8Array>` với pdf-lib + fontkit, A4 ngang, nội dung tiếng Việt, mã và URL xác thực; Route Handler kiểm chủ sở hữu, sinh một lần và lưu bucket `certificates`, trả redirect signed URL. Test unit nhỏ: PDF có text mã chứng nhận (đọc bytes bằng pdf-lib `load`).
- [ ] UI: W-55 quiz/bài tập trong player; W-56 hoàn thành với huy hiệu/điểm/tải PDF/khóa tiếp theo; W-60 `/cert/[code]` public cache theo tag; W-57 challenge: trang cohort với 7 ngày, streak, nhắc (toggle gọi sequence T23 nếu đã có, nếu chưa thì lưu pref `learning`), bảng xếp hạng tuần; W-58; W-59 lộ trình từ `learn.pathway()`; `/toi/chung-nhan`; admin review bài tập.
- [ ] E2E `challenge.spec.ts`: member tham gia cohort seed, ngày 1 hoàn thành, streak 1, xuất hiện trên bảng xếp hạng, tắt hiển thị trong cài đặt -> biến mất.
- [ ] Chạy tất cả; commit `feat: add quizzes certificates points and challenge progression`.

**Done:** hoàn thành khóa tạo đúng một chứng nhận và một lần điểm; `/cert` công khai an toàn; xếp hạng tôn trọng ẩn tên; điểm chỉ earn.

## T23. Chuỗi tự động, thông báo in-app và cài đặt kênh

**Phụ thuộc:** T21, T22. **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202702160001_sequences_notifications.sql`, `packages/core/src/notify/{sequence,sequence.test}.ts`, `apps/web/src/app/(member)/toi/thong-bao/page.tsx`, `apps/web/src/app/admin/thong-bao/chuoi/page.tsx`, `apps/web/src/components/notification-bell.tsx`, `tests/integration/sequences.test.ts`.

**Files sửa:** `supabase/migrations` `render_outbox` v2 (migration mới với `create or replace`) cho kinds `account.welcome`, `lesson.unlocked`, `course.inactive`, `course.completed`, `cohort.daily`; `supabase/functions/notify/index.ts` (template mới allowlist, ghi `core.notifications`); `(member)/toi/cai-dat/page.tsx` (kênh theo category); `(auth)/actions.ts` (signUp -> trigger `account.created` sau xác minh qua trigger trên `auth.users.email_confirmed_at`), `features/learn/player` (bật nhắc).

**Interfaces:**
- Produces: `nextStep(seq: Sequence, run: SequenceRun, now: string): {step: number; runAt: string} | null` (pure; `at_hour` tính theo giờ VN).
- RPC: `core.start_sequence(p_subject_type, p_subject_id, p_code, p_context jsonb)` (unique theo context_key), `core.stop_sequence(...)`, `core.run_sequences()` (cron 5 phút, SKIP LOCKED), `core.my_notifications(p_limit)`, `core.mark_read(p_ids)`, `core.set_pref(p_channel, p_category, p_enabled)`, `ops_config.save_sequence(jsonb)`, `learn.enqueue_unlocked()` (cron 06:00).

- [ ] Unit `sequence.test.ts`: bước `offset_minutes 0` chạy ngay; bước `at_hour 6` ngày kế tiếp giờ VN; hết bước -> null.
- [ ] Integration: tạo tài khoản + xác minh fixture -> run `welcome` active, `run_sequences` enqueue outbox `account.welcome` một lần dù gọi hai lần; enrollment không học 3 ngày (fixture `last_at` lùi) -> `course.inactive` enqueue; đã học trước giờ gửi -> `stop_if` làm run `stopped`, không enqueue; pref `learning=false` -> outbox log `skipped` với lý do; `course.completed` luôn gửi dù learning tắt (service); `my_notifications` chỉ của mình; `cohort.daily` gửi đúng người trong cohort còn active lúc 06:00.
- [ ] Chạy fail; migration bảng `ops_config.sequences`, `core.sequence_runs`, RPC, cron `sequence-tick`/`drip-unlock`, trigger `auth.users` email_confirmed -> `start_sequence('user', id, 'welcome')` (chỉ khi `core.profiles` tồn tại), render_outbox v2, seed 4 sequences (welcome, lesson_unlocked, course_inactive_3d, cohort_daily) và templates.
- [ ] notify worker: templates mới, mỗi tin tới member chèn `core.notifications` (qua RPC service), Zalo vẫn `disabled`. UI: chuông header (số chưa đọc, polling 60 giây khi tab mở), `/toi/thong-bao` W-49, cài đặt kênh W-50 với copy "Zalo sẽ mở khi ZSOPO có Zalo OA. Thông báo giao dịch luôn gửi qua email", admin chuỗi: bật/tắt, sửa bước, gửi thử cho chính mình, log 24 giờ.
- [ ] Chạy tất cả, e2e thêm case vào `challenge.spec.ts`: bật nhắc -> cài đặt hiện bật; commit `feat: add automated member sequences and in-app notifications`.

**Done:** welcome/nhắc học/nhắc challenge chạy từ dữ liệu, dừng khi mục tiêu đạt hoặc tắt kênh, không gửi lặp.

## T24. Chuyên gia: ứng tuyển, chấm điểm, pipeline, hồ sơ công khai

**Phụ thuộc:** T20. **Ước lượng:** 6-7 ngày.

**Files tạo:** `supabase/migrations/202703020001_experts.sql`, `packages/core/src/expert/{rubric,rubric.test}.ts`, `packages/api/src/experts.ts`, `apps/web/src/app/(public)/chuyen-gia/{page,[slug]/page}.tsx`, `apps/web/src/app/(member)/chuyen-gia/ung-tuyen/page.tsx`, `(member)/studio/{page,ho-so/page}.tsx`, `apps/web/src/features/experts/{application-form,scorecard,directory-filters,queries,actions}.tsx`, `apps/web/src/app/admin/chuyen-gia/{page,[id]/page}.tsx`, `apps/web/src/app/api/experts/document/route.ts`, `supabase/tests/database/expert_rls.test.sql`, `tests/integration/experts.test.ts`, `tests/e2e/experts.spec.ts`.

**Files sửa:** `core.sql` role check (migration `alter table ... drop constraint/add constraint` cho `user_roles` và `role_permissions`), `core.grant_role` (cho phép `expert` khi caller có `expert.approve`), `flags.ts` (`experts`), header, `public-routes.ts`, `json-ld.tsx` (Person), search kinds `expert`, `seed.sql` (disciplines, rubric v1), `helpers.ts` (`expertClient`).

**Interfaces:**
- Produces: `evaluate(rubric: Rubric, score: Score['criteria']): {total: number; passes: boolean; failing: string[]}`.
- RPC: `expert.apply(ApplicationInput jsonb) -> id`, `expert.my_application()`, `expert.score(p_id, p_scores jsonb, p_note)`, `expert.transition(p_id, p_to_stage, p_note)` (approved cần `expert.approve` + aal2 + `evaluate.passes`; approved tạo `experts` + `grant_role`), `expert.verify_document(p_doc, p_label)`, `expert.save_profile_draft(jsonb)`, `expert.review_profile_draft(p_expert, p_approve, p_note)`, `expert.directory(p_filter jsonb, p_page)`, `expert.public_profile(p_slug)`.

- [ ] Unit `rubric.test.ts`: fixture 5 tiêu chí thang 5, ngưỡng 18, min 3: `[4,4,4,3,3]` = 18 pass; `[5,5,5,5,2]` = 22 fail vì `ethics < 3`.
- [ ] pgTAP: member A không đọc application của B; expert không đọc `applications`; anon đọc `experts` chỉ `published`; `credential_docs` không có policy anon/member khác.
- [ ] Integration: apply thiếu `ethicsAccepted` -> `VALIDATION`; apply lần hai cùng discipline khi còn mở -> `VALIDATION`; `transition -> approved` bởi ops_finance aal1 -> `FORBIDDEN`/MFA; aal2 nhưng điểm 17 -> `VALIDATION`; đạt -> `user_roles` có `expert`, `experts.status = draft`; `suspended` -> `public_profile` NOT_FOUND; profile draft của expert chưa duyệt không đổi bản public; `application_events` không update được.
- [ ] Chạy fail; migration: role `expert`, schema `expert`, buckets `expert-docs`, RPC, policies, permissions, search v3.
- [ ] UI: W-67 form 7 bước theo discipline (câu hỏi từ `disciplines.questions`), upload chứng chỉ vào `expert-docs` qua Route Handler, trạng thái hồ sơ; admin W-124 kanban 7 cột, scorecard 5 tiêu chí với tổng/ngưỡng live từ `evaluate`, nút chuyển bước, log sự kiện, đánh dấu chứng chỉ đã xác minh (nhãn hiển thị); `/studio` hồ sơ (draft chờ duyệt) + trạng thái; public W-62 filter nhóm/hình thức/ngôn ngữ/giá, W-63 với nhãn "Đã xác minh" chỉ khi có `verified_at`, cam kết đạo đức, dịch vụ giá tham khảo, khóa/sự kiện của chuyên gia, disclaimer; JSON-LD Person không rating.
- [ ] E2E `experts.spec.ts`: member nộp hồ sơ, finance (MFA fixture) chấm đạt và duyệt, expert sửa hồ sơ, editor duyệt, trang public hiện; anon không thấy chuyên gia `draft`.
- [ ] Chạy tất cả; commit `feat: add expert application pipeline and public directory`.

**Done:** không ai lên public khi chưa duyệt đủ điểm bằng tài khoản aal2; tài liệu gốc không lộ; danh bạ lọc được và index được.

## T25. Sự kiện: tạo, đăng ký, chờ, nhắc, QR check-in, sau sự kiện

**Phụ thuộc:** T23 (nhắc), T24 (host). **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202703020002_events.sql`, `packages/api/src/events.ts`, `apps/web/src/app/(public)/su-kien/{page,[slug]/page}.tsx`, `(member)/su-kien/[slug]/sau-su-kien/page.tsx`, `(member)/toi/{ve/page,dat-cho/page}.tsx`, `apps/web/src/features/events/{register-button,ticket-qr,checkin-form,queries,actions}.tsx`, `apps/web/src/app/admin/su-kien/{page,[id]/page}.tsx`, `apps/web/src/app/ops/su-kien/page.tsx`, `(member)/studio/su-kien/page.tsx`, `tests/integration/events.test.ts`, `tests/e2e/events.spec.ts`.

**Files sửa:** `render_outbox` v3 (`event.*` kinds), notify templates, `flags.ts` (`events`), header, `public-routes.ts`, `json-ld.tsx` (Event), search kinds `event`, ops nav, `seed.sql`.

**Interfaces:**
- RPC: `events.register(p_slug) -> RegistrationResult`, `events.cancel(p_registration)`, `events.my_tickets()`, `events.ticket_code(p_registration) -> text` (owner, token mới nếu chưa có), `events.checkin(p_code) -> {registration, displayName}`, `events.rate(p_registration, p_rating, p_review)`, `events.save_event(jsonb)`, `events.publish_event(p_id, p_expected_version)` (từ chối price > 0, tạo nhóm cộng đồng khi T26 có), `events.enqueue_reminders()` (cron 5 phút), `events.mark_done()` (cron giờ).

- [ ] Integration: hai member đăng ký suất cuối song song -> một `registered`, một `waitlisted position 1`; hủy người registered -> người chờ thành `registered` + outbox `event.waitlist_promoted`; đăng ký chưa xác minh -> `EMAIL_UNVERIFIED`; publish price 10000 -> `VALIDATION`; `checkin` bởi front_desk điểm khác -> `FORBIDDEN`, bởi host -> ok, lần hai cùng mã -> `INVALID_TRANSITION`; đổi `starts_at` sau khi reminder enqueue -> render tại giờ gửi dùng giờ mới (assert vars.when), sự kiện `cancelled` -> `skip`; `rate` trước `done` -> `INVALID_TRANSITION`; anon không thấy `meet_url`.
- [ ] Chạy fail; migration schema `events`, RPC với `select ... for update` trên dòng sự kiện, token 256-bit hash, cron, permissions `event.manage/event.checkin`, policies.
- [ ] UI: W-69 lịch tháng/danh sách với filter loại/online/miễn phí; W-70 chi tiết với Energy Card, chương trình, host link, sức chứa còn, nút đăng ký/chờ, disclaimer, JSON-LD Event; W-71 `/toi/ve` QR (qrcode) + mã 6 ký tự; `/toi/dat-cho` gộp phòng (từ receipt claim GĐ0) và sự kiện; W-74 sau sự kiện: đánh giá, tài liệu, ghi hình chỉ cho người đăng ký; admin W-125 phần sự kiện (tạo/sửa/publish/hủy, danh sách tham dự, xuất CSV không PII thừa, gán host); ops `/ops/su-kien` check-in bằng nhập mã hoặc quét (BarcodeDetector khi có, fallback nhập tay); studio sự kiện được gán + check-in.
- [ ] E2E `events.spec.ts`: member đăng ký sự kiện seed, thấy vé QR; lễ tân check-in bằng mã; admin đánh dấu done; member đánh giá.
- [ ] Chạy tất cả; commit `feat: add free events with waitlist reminders and qr check-in`.

**Done:** không vượt sức chứa dưới tranh chấp, danh sách chờ tự lên, nhắc đúng giờ mới, link Meet chỉ tới người đăng ký.

## T26. Cộng đồng v1 và cây tâm nguyện

**Phụ thuộc:** T21, T25. **Ước lượng:** 5-6 ngày.

**Files tạo:** `supabase/migrations/202703160001_community.sql`, `packages/core/src/community/{moderation,moderation.test}.ts`, `packages/api/src/community.ts`, `apps/web/src/app/(member)/cong-dong/{page,nhom/[slug]/page,bai/[id]/page,viet/page,bao-cao/page}.tsx`, `apps/web/src/app/(public)/cong-dong/cay-tam-nguyen/page.tsx`, `apps/web/src/features/community/{post-card,composer,comment-thread,report-dialog,wish-tree,queries,actions}.tsx`, `apps/web/src/app/admin/cong-dong/page.tsx`, `apps/web/src/app/api/community/image/route.ts`, `supabase/tests/database/community_rls.test.sql`, `tests/integration/community.test.ts`, `tests/e2e/community.spec.ts`.

**Files sửa:** `learn.publish_course`/`events.publish_event` (migration mới: tạo group kind course/event), `learn.enroll_free`/`events.register` (auto membership), `flags.ts` (`community`), header, `seed.sql`.

**Interfaces:**
- Produces: `screen(text: string, keywords: {term: string; action: 'reject'|'review'}[]): {action: 'ok'|'reject'|'review'; hit?: string}` (không dấu, không phân biệt hoa thường).
- RPC: `community.create_post(p_group, p_body, p_media uuid[]) -> {id, status}`, `community.comment(p_post, p_body)`, `community.thank(p_target_type, p_target_id)`, `community.report(p_target_type, p_target_id, p_reason)`, `community.moderate(p_target_type, p_target_id, p_action keep|remove|warn|suspend, p_note, p_until)`, `community.join(p_group)`, `community.feed(p_page)`, `community.group_posts(p_slug, p_page)`, `community.submit_wish(p_text, p_location)`, `community.wishes(p_location, p_page)` (anon, không `user_id`), `community.moderate_wish(p_id, p_show)`.

- [ ] Unit `moderation.test.ts`: từ khóa `reject` khớp không dấu "chua benh" trong "chữa bệnh"; `review` trả review; sạch -> ok.
- [ ] pgTAP: anon không đọc `posts`; member không đọc post `pending` của người khác; `wishes` qua view public không có cột `user_id`; member không update `reports`.
- [ ] Integration: member mới (0 bài duyệt) đăng -> `pending`, outbox `post.pending_review`; sau 3 bài được duyệt -> `published` ngay; bài chứa từ `reject` -> `MODERATION_REJECTED` kèm gợi ý; người bị `suspend` đăng -> `FORBIDDEN`; thank hai lần -> một dòng; 11 bài/giờ -> `RATE_LIMITED`; nhóm `private` cần duyệt join; ghi danh khóa -> membership nhóm khóa; wish thứ 4 trong ngày -> `RATE_LIMITED`; `wishes()` không trả wish `pending`.
- [ ] Chạy fail; migration schema `community`, bucket `community-media` public với policy owner, RPC, trigger đếm thanks/comments, policies, permission `community.moderate`, seed từ khóa chặn mẫu (chủ nội dung bổ sung).
- [ ] UI: W-75 feed + nhóm của tôi + cây + nhóm gợi ý; W-76 nhóm với quy tắc và tham gia; W-77 bài + bình luận + cảm ơn + báo cáo (ẩn danh với người bị báo cáo); W-78 soạn bài Markdown an toàn + ảnh (alt bắt buộc; strip EXIF bằng re-encode qua `<canvas>` phía client trước khi upload, Route Handler kiểm magic bytes và từ chối file còn EXIF; không thêm thư viện ảnh server, ghi ruling); W-79 cây tâm nguyện public với lọc điểm, form gửi; W-82 báo cáo của tôi; admin W-126 hàng đợi duyệt, báo cáo, từ khóa, sanction với lý do.
- [ ] E2E `community.spec.ts`: member mới đăng bài -> "đang chờ duyệt"; editor duyệt -> hiện trong nhóm; bình luận, cảm ơn; gửi điều ước -> admin duyệt -> hiện trên cây.
- [ ] Chạy tất cả; commit `feat: add moderated community groups posts and wish tree`.

**Done:** không nội dung chưa duyệt lọt public, báo cáo ẩn danh, sanction có hiệu lực ngay, điều ước không lộ danh tính.

## T27. Landing builder, lead magnet và UTM

**Phụ thuộc:** T21 (quà khóa), T23 (sequence). **Ước lượng:** 4-5 ngày.

**Files tạo:** `supabase/migrations/202703160002_landing_leads.sql`, `packages/core/src/content/{landing-blocks,landing-blocks.test}.ts` (Zod schema các khối), `packages/api/src/landing.ts`, `apps/web/src/app/(public)/l/[slug]/{page,cam-on/page}.tsx`, `apps/web/src/features/landing/{blocks,lead-form,queries,actions}.tsx`, `apps/web/src/app/admin/noi-dung/landing/{page,[id]/page}.tsx`, `apps/web/src/app/api/landing/magnet/route.ts`, `tests/integration/landing.test.ts`, `tests/e2e/landing.spec.ts`.

**Files sửa:** `render_outbox` v4 (`lead.magnet`, `lead.welcome`), notify templates, `public-routes.ts`, `crm.customer_timeline` (lead), CRM tag seed, PostHog event `lead_captured` (T28 nối SDK), `seed.sql`.

**Interfaces:**
- Produces: `LandingBlockSchema` (discriminated union 7 khối), `parseBlocks(json): Block[]`, `canPublish(blocks): {ok: boolean; reasons: string[]}` (testimonial thiếu `source`/`approved`, countdown quá khứ).
- RPC: `content.submit_lead(LeadInput jsonb) -> {leadId, thankYouPath}` (anon, rate limit IP 5/giờ, honeypot rỗng), `content.resend_magnet(p_lead_token)`, `content.save_landing(jsonb)`, `content.publish_landing(p_id, p_expected_version)`, `content.leads_list(p_landing, p_page)`, `content.claim_course_gift(p_token)` (member verified: ghi danh khóa quà).

- [ ] Unit: `canPublish` từ chối testimonial không `approved`; countdown `ends_at` quá khứ; khối không trong allowlist -> parse lỗi.
- [ ] Integration: submit thiếu consent -> `VALIDATION`; honeypot có giá trị -> trả ok nhưng không tạo lead (assert count); email trùng khách có `user_id` -> lead mới `customer_id` là customer mới, không phải của tài khoản cũ, `duplicate_suggestions` có gợi ý; quà file -> outbox `lead.magnet` với signed URL hạn 7 ngày; quà khóa -> email có link `claim`, claim bởi member khác email -> `FORBIDDEN`; sequence `welcome_lead` start một lần; 6 submit/giờ cùng IP -> `RATE_LIMITED`; `resend_magnet` lần hai trong ngày -> `RATE_LIMITED`.
- [ ] Chạy fail; migration bảng `landing_pages/landing_revisions/leads`, bucket `lead-magnets`, RPC, permission `landing.manage`, policies.
- [ ] Admin W-128 landing: danh sách, editor khối (thêm/xóa/sắp xếp, form theo schema từng khối, preview), cấu hình quà và chuỗi, publish với lý do từ `canPublish`, bảng lead có UTM, xuất CSV theo quyền `crm.export`. Public `/l/[slug]` W-06 render khối, form với consent + honeypot + UTM từ query, `/l/[slug]/cam-on` W-07 với tải/gửi lại; noindex khi `seo.index=false`.
- [ ] E2E `landing.spec.ts`: anon điền form với `?utm_source=zalo`, trang cảm ơn, lead trong admin có utm; tải file quà.
- [ ] Chạy tất cả; commit `feat: add landing builder with lead magnets and welcome sequence`.

**Done:** lead có consent/UTM, quà tới đúng người, không tự liên kết tài khoản người khác, landing chỉ publish khi khối hợp lệ.

## T28. Hardening, SEO, dashboard GĐ1, CRM, UAT và phát hành Connect

**Phụ thuộc:** T20-T27. **Ước lượng:** 5-6 ngày kỹ thuật + UAT theo sprint.

**Files tạo:** `supabase/migrations/202703230001_gd1_reporting.sql`, `packages/core/src/commerce/{learn-metrics,learn-metrics.test}.ts`, `apps/web/src/lib/analytics/{posthog-client,posthog-server,consent-banner}.tsx`, `tests/e2e/{security-idor,seo-gd1}.spec.ts`, `tests/integration/gd1-reporting.test.ts`, `docs/releases/{s4,s5-s6,s7,s8}.md`, `docs/uat/{member,learn,experts,events,community,landing}.md`, `docs/runbooks/{moderation,sequences}.md`, `docs/security/asvs-l1-checklist.md`, `docs/payments/vnpay-momo-dossier.md`.

**Files sửa:** `apps/web/src/app/admin/page.tsx` (khối GĐ1), `crm.customer_timeline` v2, `tests/e2e/seo.spec.ts`, `tests/e2e/accessibility.spec.ts` (thêm 6 trang mới light/dark), `tests/performance/public-pages.ts` (template mới), `docs/seo-content-checklist.md`, `apps/web/src/app/robots.ts`, `README.md`, `docs/implementation-rulings.md`.

**Interfaces:**
- RPC: `learn.metrics(p_entity, p_from, p_to) -> {learners, enrollments, hoursLearned, completionRate, certificates, expertsPublished, applicationsByStage, events, registrations, checkins, leadsByLanding}`; `crm.customer_timeline` thêm kinds `enrollment`, `course_completed`, `event_registration`, `lead` (không có `energy`).
- Produces: `completionRate(enrollments: {completed: boolean; startedBefore: boolean}[]): number` (mẫu: ghi danh ≥14 ngày).

- [ ] Unit `learn-metrics.test.ts`: completionRate loại ghi danh < 14 ngày; 0 ghi danh -> 0 không chia cho 0.
- [ ] Integration reporting: metrics theo entity không gộp entity khác; giờ học = tổng `seconds` / 3600 làm tròn 1 chữ số; timeline CRM của khách có ghi danh không chứa bất kỳ khóa `energy`.
- [ ] E2E `security-idor.spec.ts`: member A gọi trực tiếp URL/RPC của B cho hồ sơ, tiến độ, chứng nhận, vé, thông báo, bài pending -> 403/404; staff không mở `/toi/*` của người khác; `/cert/[code]` không có email; `/api/learn/audio` không ghi danh -> 403.
- [ ] E2E `seo-gd1.spec.ts`: no-JS fetch `/learn/[slug]`, `/chuyen-gia/[slug]`, `/su-kien/[slug]` có JSON-LD Course/Person/Event khớp UI, không rating; sitemap có chúng và không có `/toi`, `/studio`, `/l/*` noindex, `/cert/*` (không index chứng nhận cá nhân, ruling); `llms.txt` thêm Learn/Chuyên gia/Sự kiện.
- [ ] Chạy fail; implement metrics RPC, dashboard khối GĐ1 (CSS bars), timeline v2, robots/sitemap/llms, PostHog: banner consent (localStorage chỉ cho lựa chọn), `posthog-js` chỉ init khi `NEXT_PUBLIC_POSTHOG_KEY` và consent; server capture `course_enrolled`, `lesson_completed`, `course_completed`, `certificate_issued`, `expert_viewed`, `event_registered`, `event_checked_in`, `energy_quiz_completed` (không payload nhạy cảm, không persona), `energy_checkin` (chỉ đếm), `lead_captured` (utm); mask input, tắt replay trên `/toi`, `/ho-so-nang-luong`, admin, ops.
- [ ] Hardening: kiểm mọi RPC public mới có `core.rate_limit`; `pnpm audit --prod` không high; checklist ASVS L1 điền bằng chứng; axe light/dark 6 trang mới; performance budget template mới (JS public ≤180KB gzip); 320px/zoom 200% kiểm tay ghi UAT.
- [ ] Tài liệu: release notes S4-S8 với gate thực địa (100 hồ sơ, ≥500 challenge, 30/10/2, 2.000 đăng ký, DPIA, rubric v1, quiz v1, 4 khóa nội dung thật) ghi "pending" khi chưa có; UAT theo actor; runbook kiểm duyệt (SLA 24 giờ, escalation nội dung nguy hiểm), runbook chuỗi (dừng khẩn một sequence, replay); checklist hồ sơ VNPay/MoMo (giấy phép, website đang chạy, pháp nhân nhận tiền, 2-4 tuần); cập nhật README thứ tự đọc.
- [ ] Chạy full suite từng lệnh một dòng; `! grep -rE 'sb_secret_|service_role' apps/web/.next/static`; commit `docs: hand over gd1 connect release and evidence`.

**Done:** IDOR/RLS deny-case xanh, SEO/a11y/perf đạt trên template mới, dashboard và CRM có số GĐ1 từ dữ liệu thật, analytics theo consent, release notes tách rõ việc code đã xong và gate cần người thật.

## 3. Checklist tự rà soát plan

- [ ] Mọi story MUST GĐ1 (NRG-01, LRN-01, LRN-02, MEM-05, EXP-01, EXP-02, EVT-01, COM-01, CNT-03, ADM-01/02 GĐ1) có task, màn hình, RPC và test; SHOULD được chọn (NRG-03, LRN-03, LRN-05, COM-02 cây) có ghi lý do; SHOULD bỏ (CNT-04) ghi hoãn.
- [ ] Không task nào tạo `commerce.orders` 0 đồng, không cổng thanh toán, không tư vấn/thuê bao/Give/payout/Studio soạn khóa.
- [ ] Dữ liệu nhạy cảm: pgTAP deny super_admin trên `energy.profiles` (T20), không có trong timeline/analytics/export (T28), xóa cứng và tombstone (T20).
- [ ] Contract tên hàm/kiểu dùng ở T21-T28 khớp mục 3 spec 06; ERROR_CODES mới khai báo ở T20 trước khi task sau dùng.
- [ ] Race: suất cuối sự kiện (T25), hoàn thành khóa song song (T22), heartbeat idempotent (T21), thank/enroll/register idempotent.
- [ ] Review Focus 1-5 đều có test ở task sở hữu (T21/T25/T26, T20, T22, T25, T27).
- [ ] Release checklist tách test kỹ thuật khỏi gate thực địa và phê duyệt pháp lý/nội dung.
