# Kiến trúc GĐ1: phần bổ sung trên lõi GĐ0

Áp dụng toàn bộ `02-architecture.md` và các ruling đã có (SQL definer RPC + `core.fail`, `core.rate_limit` trong DB, idempotency `commerce.idem_get`, outbox + `render_outbox`, Markdown an toàn, Cache Components với `instant=false` cho trang riêng tư). Tài liệu này chỉ ghi schema, quyền, contract, job và route mới.

## 1. Schema mới

Năm schema mới `energy`, `learn`, `expert`, `events`, `community` phải được thêm vào `supabase/config.toml` `[api].schemas`, script `db:types` trong `package.json`, `SCHEMAS` trong `scripts/check-rls.mjs` và `scripts/check-types.mjs`. Mọi bảng có RLS, `entity_id` lấy từ `runtime_settings connect.entity_id` (seed: E1), `created_at/updated_at/version` theo chuẩn GĐ0.

| Schema | Bảng |
|---|---|
| energy | quiz_definitions(code, version, questions, scoring_rules, recommendation_rules, status draft/active/retired, unique(code,version)); profiles(user_id pk, quiz_version, persona, persona_scores, chakra_scores, low_chakras, goals, answers_enc bytea, share_with_experts, computed_at); checkins(user_id, at, score, mood, note, context, ref_id); report cache không cần |
| learn | courses, sections, lessons, cohorts, enrollments(unique user,course), lesson_progress(unique enrollment,lesson), heartbeats(idempotency uuid pk, enrollment_id, lesson_id, at), quiz_attempts, assignments, certificates(code unique), badges, user_badges(unique user,badge) |
| commerce | point_transactions(user_id, entity_id, kind, points, source_type, source_id, expires_at, unique(kind,source_type,source_id)) append-only qua `commerce.forbid_mutation` |
| expert | disciplines, rubrics, applications, application_events (append-only), experts(user_id unique, slug unique), profile_drafts, services, credential_docs(application_id, media_id, verified_at, verified_by, label) |
| events | events(slug unique), registrations(unique event,user), event_ratings |
| community | groups, memberships, posts, comments, thanks, reports, blocked_keywords, sanctions, wishes |
| content | landing_pages, landing_revisions (append-only), leads |
| core | notifications(user_id, kind, title, body, link, read_at), notification_prefs, sequence_runs |
| ops_config | sequences |

Ràng buộc đáng chú ý: `lessons.content` phải thỏa `learn.validate_lesson()` theo `kind` (trigger); `courses.price = 0` và `events.price = 0` là điều kiện của `publish_*` GĐ1 (check trong RPC, không trong DDL để GĐ2 không cần migration phá); `registrations.position` chỉ có khi `waitlisted`; `wishes.user_id` không nằm trong view public; `energy.profiles` không có policy nào cho staff; `point_transactions` unique nguồn; `certificates.code` sinh từ sequence theo tháng.

Buckets mới (private trừ khi ghi): `learn-media` (audio ≤50MB), `learn-submissions` (≤10MB), `certificates`, `expert-docs`, `lead-magnets`, `community-media` (public, ảnh ≤5MB, strip EXIF). Policy upload theo `core.has_permission` hoặc chủ sở hữu; đọc qua signed URL do server cấp sau kiểm quyền.

## 2. Quyền

Thêm giá trị `expert` vào hai check constraint role. Thêm action vào `core.role_permissions`:

| Action | editor | ops_finance | location_manager | front_desk | expert | super_admin |
|---|---|---|---|---|---|---|
| energy.manage (bộ câu hỏi, quy tắc) | | x | | | | aal2 |
| energy.report (ẩn danh) | | x | | | | aal2 |
| course.manage, course.publish | x | | | | | aal2 |
| assignment.review | x | | | | own course* | aal2 |
| expert.review | | x | | | | aal2 |
| expert.approve | | aal2 | | | | aal2 |
| expert.profile_review | x | | | | | aal2 |
| event.manage | | x | | | | aal2 |
| event.checkin | | | x (điểm) | x (điểm) | own event | aal2 |
| community.moderate | x | | | | | aal2 |
| landing.manage | x | | | | | aal2 |
| sequence.manage | | x | | | | aal2 |
| privacy.process | | x (aal2) | | | | aal2 |

`*` quyền "own" của expert được kiểm bằng ownership trong RPC (`teacher_expert_id`/`host_expert_id` = expert của `auth.uid()`), không qua `role_permissions`. Member không có dòng nào; mọi policy member là `user_id = auth.uid()`. Thao tác ghi đi qua RPC definer gọi `core.require_verified_member()` (đọc `auth.users.email_confirmed_at`, không tin claim client), trả `EMAIL_UNVERIFIED` khi chưa xác minh.

`core.grant_role('expert', entity, null)` được gọi bên trong `expert.approve_application` (SECURITY DEFINER, kiểm `expert.approve` + aal2), không qua staff-admin Edge vì không cần mời email.

## 3. Contract (packages/core/src/contracts)

Bổ sung vào `contracts/index.ts` (giữ `DomainResult`, `Money`, `UUID`):

```ts
type QuizQuestion = { id: string; kind: 'single'|'multi'|'scale'|'chakra'; text: string; hint?: string;
  options?: { id: string; label: string; weights: Partial<Record<Persona, number>> & { chakra?: Partial<Record<Chakra, number>> } }[];
  scale?: { lo: string; hi: string; min: number; max: number; chakra?: Chakra } };
type QuizAnswer = { questionId: string; optionIds?: string[]; value?: number; chakras?: Chakra[] };
type Persona = 'seeking_healing'|'seeking_guidance'|'early_awakener'|'conscious_seeker'|'future_healer'|'conscious_entrepreneur'|'servant';
type EnergyResult = { persona: Persona; personaScores: Record<Persona, number>; chakraScores: Record<Chakra, number>;
  lowChakras: Chakra[]; actions: { kind: 'course'|'product'|'expert'|'space'; slug: string; title: string; why: string }[] };
type LessonPublic = { id: UUID; slug: string; title: string; kind: 'video'|'audio'|'text'|'quiz'|'assignment'; durationS: number;
  availableAt: string | null; status: 'locked'|'available'|'completed'; content: unknown /* đã lọc đáp án */ };
type Heartbeat = { lessonId: UUID; idempotencyKey: UUID };
type QuizSubmission = { lessonId: UUID; answers: { questionId: string; optionIds: string[] }[] };
type ApplicationInput = { discipline: string; answers: Record<string, unknown>; documentIds: UUID[]; introVideoUrl?: string;
  references: { name: string; contact: string; relation: string }[]; ethicsAccepted: true };
type Score = { criteria: Record<'knowledge'|'practice'|'awakening'|'ethics'|'teaching', number>; note: string };
type RegistrationResult = { state: 'registered'|'waitlisted'; position?: number; ticketPath: string };
type LeadInput = { landingSlug: string; name: string; email?: string; phone?: string; consent: true; utm?: Record<string, string>; honeypot?: string };
```

Mã lỗi mới thêm vào `ERROR_CODES`: `EMAIL_UNVERIFIED` (403), `LESSON_LOCKED` (403), `ATTEMPTS_EXHAUSTED` (409), `EVENT_FULL` (409, trả waitlist thay vì fail khi còn chỗ chờ), `MODERATION_REJECTED` (422), `CONSENT_REQUIRED` (428). Copy tiếng Việt trong `packages/api/src/rpc.ts` `defaultMessage`.

Typed wrappers mới trong `packages/api/src/{energy,learn,experts,events,community,landing}.ts`, tất cả qua `call(client, schema, fn, args)`:

| Wrapper | RPC | Quyền |
|---|---|---|
| submitQuiz(answers, quizVersion, consents) | energy.submit_quiz | member verified, consent sensitive_energy |
| getMyProfile() / deleteMyProfile(deleteCheckins) | energy.my_profile / energy.delete_my_profile | owner |
| checkin({score, mood, note, context, refId}) | energy.checkin | owner, rate 30/ngày |
| enrollFree(courseSlug) | learn.enroll_free | member verified |
| heartbeat(Heartbeat) | learn.heartbeat | owner enrollment |
| completeLesson(lessonId) / submitQuiz(QuizSubmission) / submitAssignment(lessonId, bodyMd, mediaId?) | learn.complete_lesson / learn.submit_quiz / learn.submit_assignment | owner |
| issueCertificate(enrollmentId) | learn.issue_certificate (gọi nội bộ từ complete_lesson, cũng gọi thủ công bởi editor) | owner/editor |
| applyExpert(ApplicationInput) / scoreApplication(id, Score) / transitionApplication(id, toStage, note) | expert.apply / expert.score / expert.transition | member / expert.review / expert.approve khi approved |
| registerEvent(slug) / cancelRegistration(id) / checkinTicket(code) / rateEvent(id, rating, review) | events.register / cancel / checkin / rate | member / host or event.checkin |
| createPost, comment, thank, report, moderate | community.* | member với sanction check / community.moderate |
| submitLead(LeadInput) | content.submit_lead | anon, rate limit IP 5/giờ, honeypot |

## 4. Job, outbox và realtime

Outbox kinds mới (render tại thời điểm gửi, bỏ qua khi trạng thái không còn đúng): `account.welcome`, `lead.magnet`, `lead.welcome`, `lesson.unlocked`, `course.inactive`, `course.completed` (kèm link chứng nhận), `cohort.daily`, `event.confirmed`, `event.waitlist_promoted`, `event.reminder` (24h/1h), `event.cancelled`, `application.stage_changed`, `post.pending_review` (cho moderator), `privacy.request_received`. Mỗi kind hướng tới member ghi thêm `core.notifications`.

pg_cron mới: `sequence-tick` mỗi 5 phút (`core.run_sequences()`), `drip-unlock` lúc 06:00 giờ VN (`learn.enqueue_unlocked()` theo ngày), `event-reminders` mỗi 5 phút, `event-done` mỗi giờ (chuyển `done` khi `ends_at` qua), `privacy-deletions` hằng ngày (kick Edge `account-delete`), `points-expire` hằng ngày (GĐ1 chỉ ghi `expire` khi quá hạn, chưa có redeem).

Edge Function mới: `account-delete` (service role: xóa auth user, ẩn danh profile/customer, giữ tombstone), `certificate-pdf` không cần Edge, sinh trong Route Handler Next bằng pdf-lib và ghi vào bucket qua server client có quyền owner. Không có Edge nào khác; mọi logic khác là SQL definer.

Realtime: không bắt buộc GĐ1. Bảng xếp hạng và hàng đợi kiểm duyệt dùng revalidate/polling 30 giây; thông báo in-app dùng polling khi tab mở. Thêm realtime khi có nhu cầu đo được.

## 5. Dữ liệu nhạy cảm

- `energy.profiles.answers_enc`: `pgp_sym_encrypt(answers::text, vault.decrypted_secrets 'energy_answers_key')` trong `energy.submit_quiz`; giải mã chỉ trong `energy.my_profile()`. Secret tạo theo môi trường (runbook `docs/runbooks/keys.md` bổ sung mục này); local seed đặt khóa demo, `seed-validate --production` từ chối khóa demo.
- Không staff policy trên `energy.*`; `energy.report` là definer chỉ trả tổng hợp n ≥ 20 từ người có consent `research`. pgTAP khẳng định super_admin select `energy.profiles` trả 42501.
- Nhật ký cảm xúc, câu trả lời quiz, ghi chú bài tập, chứng chỉ gốc, phiếu tham chiếu ứng tuyển không vào PostHog, Sentry breadcrumbs, audit diff hay CSV export. Audit chỉ ghi metadata (ai, hành động, khi nào).
- Xóa hồ sơ năng lượng xóa cứng; xóa tài khoản theo quy trình 72 giờ với tombstone (`core.deleted_accounts(user_hash, deleted_at)`) để restore không hồi sinh dữ liệu (áp dụng runbook restore GĐ0).

## 6. Rendering và cache

- Public: `/learn`, `/learn/[slug]`, `/chuyen-gia`, `/chuyen-gia/[slug]`, `/su-kien`, `/su-kien/[slug]`, `/cert/[code]`, `/l/[slug]`, `/cong-dong/cay-tam-nguyen` dùng `'use cache'` + `cacheTag` theo slug, invalidate qua `/api/revalidate` khi publish/đổi trạng thái; chỗ còn lại của sự kiện và bảng xếp hạng là phần động trong Suspense.
- Riêng tư: `/toi/*`, player `/learn/[slug]/bai/[lesson]`, `/studio`, `/cong-dong/*` (trừ cây), admin mới: `instant=false`, no-store, noindex như GĐ0.
- Player video là client island nhúng `youtube-nocookie` với IFrame API chỉ để đo tiến độ; audio dùng `<audio>` native với signed URL. Không thêm thư viện player.
- Bundle: pdf-lib chỉ ở Route Handler; QR dùng `qrcode` đã có; biểu đồ luân xa/cảm xúc là SVG tự vẽ, không chart library.

## 7. Route mới

| ID | Route | Nhóm | Task |
|---|---|---|---|
| W-38/39/40 | `/ho-so-nang-luong`, `/ho-so-nang-luong/quiz`, `/ho-so-nang-luong/ket-qua` | (member) | T20 |
| W-41, W-42, W-43, W-44, W-45, W-49, W-50 | `/toi`, `/toi/nhat-ky`, `/toi/khoa-hoc`, `/toi/chung-nhan`, `/toi/dat-cho`, `/toi/don-hang`, `/toi/thong-bao`, `/toi/cai-dat` | (member) | T20, T22, T23, T25 |
| W-51..W-56 | `/learn`, `/learn/khoa-hoc`, `/learn/[slug]`, `/learn/[slug]/bai/[lesson]`, `/learn/[slug]/hoan-thanh` | (public)/(member) | T21, T22 |
| W-57..W-60 | `/learn/challenge/[cohort]`, `/learn/bang-xep-hang`, `/learn/lo-trinh`, `/cert/[code]` | | T22 |
| W-62, W-63, W-67, W-68 (một phần) | `/chuyen-gia`, `/chuyen-gia/[slug]`, `/chuyen-gia/ung-tuyen`, `/studio` | | T24 |
| W-69, W-70, W-71, W-74 | `/su-kien`, `/su-kien/[slug]`, `/toi/ve`, `/su-kien/[slug]/sau-su-kien` | | T25 |
| W-75..W-79, W-82 | `/cong-dong`, `/cong-dong/nhom/[slug]`, `/cong-dong/bai/[id]`, `/cong-dong/viet`, `/cong-dong/cay-tam-nguyen`, `/cong-dong/bao-cao` | | T26 |
| W-06, W-07 | `/l/[slug]`, `/l/[slug]/cam-on` | (public) | T27 |
| W-130, W-123, W-124, W-125, W-126, W-128 (landing), W-129 (chuỗi) | `/admin/ho-so-nang-luong`, `/admin/khoa-hoc`, `/admin/chuyen-gia`, `/admin/su-kien`, `/admin/cong-dong`, `/admin/noi-dung/landing`, `/admin/thong-bao/chuoi`, `/admin/quyen-rieng-tu` | admin | T20-T28 |
| ops | `/ops/su-kien` (check-in tại điểm) | ops | T25 |

`FEATURES` thêm `energy`, `learn`, `experts`, `events`, `community`, `landing`; header thêm "Learn", "Chuyên gia", "Sự kiện", "Cộng đồng" khi bật và nút "Tôi"/chuông khi đăng nhập. `publicRoutes()` thêm khóa/chuyên gia/sự kiện/landing đã published; `search_public` thêm kinds `course`, `expert`, `event`.

## 8. Hoãn có chủ đích (prototype có, GĐ1 không làm)

W-05 podcast player; W-37 SĐT OTP/Zalo/liên kết theo SĐT; W-46/47/48 ví điểm đầy đủ, Premium, referral/affiliate; W-61 live class; W-64/65/66 đặt tư vấn; W-68 Expert Studio ngoài hồ sơ/trạng thái/sự kiện được gán; W-72 livestream chat; W-73 retreat; W-80 nhật ký hành trình; W-81 healing circle; W-109/W-110 ops năng lượng; W-119..W-122, W-127; BigQuery trong W-132. Các route này không tồn tại hoặc trả trang giới thiệu CMS có flag, không form giả.
