# Đặc tả sản phẩm GĐ1: Web MVP nền tảng Connect

Ngày: 29/10/2026. Nguồn chuẩn: `prepare/ZSOPO_PRD_Implementation Plan.html` mục 3.4-3.8, 3.11, 8 (GĐ1 S4-S8), 11, 12; prototype `prepare/design/Web 5.1 W02-W11, 5.4 W37-W50, 5.5 W51-W61, 5.6 W62-W68, 5.7 W69-W74, 5.8 W75-W82, 5.11 W123-W130`; tài liệu `ĐỊNH HƯỚNG TIÊU CHÍ TUYỂN CHỌN CHUYÊN GIA.docx`, `Kế hoạch nội dung truyền thông.docx`, `Growth hacking.docx`. Kế thừa toàn bộ `01-product-gd0.md`, `02-architecture.md`, `04-seo-quality.md` và các ruling trong `../docs/implementation-rulings.md`; tài liệu này chỉ ghi phần thêm hoặc khác.

## 1. Mục tiêu và ranh giới

GĐ1 (05/01-26/03/2027) mở mặt tiền Connect: hồ sơ năng lượng, LMS miễn phí, danh bạ chuyên gia, sự kiện miễn phí, cộng đồng v1, landing/lead magnet và chuỗi chăm sóc tự động. Mọi thứ chạy trên lõi GĐ0 đã có: một app Next.js, Supabase, `core.customers`, `commerce.orders`, outbox, `core.role_permissions`, CMS, CRM, dashboard.

Không có tiền mới trong GĐ1. Khóa trả phí, vé trả phí, tư vấn 1:1, thuê bao, referral, ví điểm đổi/hạng, Give, Expert Studio đầy đủ (soạn khóa, payout), live class, podcast player, nhật ký hành trình riêng, healing circle, SĐT OTP/Zalo login đều giữ đúng giai đoạn PRD (GĐ2-GĐ3). Giao diện có thể hiện "sắp mở" bằng trang giới thiệu thật, không có nút giả.

Mốc PRD giữ nguyên: S4 05-16/01, S5-S6 19/01-27/02, S7 02-13/03, S8 16-26/03, phát hành Connect công khai 27/03/2027. Vẫn là mục tiêu lập kế hoạch với một CTO; PRD khuyến nghị thêm dev từ 01/2027. Không hạ MUST để ép lịch; cắt SHOULD trước.

## 2. Vai trò mới

| Vai trò | Cách hiện thực | Năng lực |
|---|---|---|
| member | Mọi tài khoản Auth đã xác minh email không có staff role. Không thêm dòng `role_permissions`; quyền là chủ sở hữu dữ liệu qua RLS `user_id = auth.uid()` | Hồ sơ năng lượng, check-in cảm xúc, ghi danh khóa miễn phí, chứng nhận, đăng ký sự kiện, cộng đồng, thông báo, xuất/xóa dữ liệu của mình |
| expert | Thêm giá trị `expert` vào check constraint `user_roles.role`/`role_permissions.role`; cấp bằng `core.grant_role` khi duyệt hồ sơ ứng tuyển, entity = entity Connect | Sửa hồ sơ công khai của mình (qua duyệt), xem trạng thái ứng tuyển, host sự kiện được admin gán, check-in sự kiện của mình. Chưa soạn khóa, chưa lịch rảnh, chưa payout |
| editor (mở rộng) | Thêm action | `course.manage`, `course.publish`, `landing.manage`, `community.moderate`, `expert.profile_review` |
| ops_finance (mở rộng) | Thêm action | `expert.review`, `expert.approve` (aal2), `event.manage`, `energy.manage`, `energy.report`, `sequence.manage` |
| location_manager, front_desk (mở rộng) | Thêm action theo điểm | `event.checkin` cho sự kiện tại điểm của mình |
| super_admin | Tất cả action mới, aal2 | |

Hồ sơ năng lượng, câu trả lời quiz, nhật ký cảm xúc: không có staff policy nào đọc được bản ghi cá nhân, kể cả super_admin. Báo cáo chỉ qua hàm tổng hợp ẩn danh trên người đã đồng ý mục đích `research`.

## 3. Ma trận phạm vi bắt buộc GĐ1

| PRD story | Mức | Phạm vi thực hiện và acceptance chính | Task |
|---|---|---|---|
| US-NRG-01 | MUST | Bộ câu hỏi và quy tắc gợi ý versioned trong admin; màn đồng ý riêng trước quiz; 10-15 câu (4 dạng: một lựa chọn, nhiều lựa chọn, thang 1-5, chọn luân xa); kết quả persona + 7 chỉ số luân xa + 3 hành động (khóa, sản phẩm, chuyên gia, không gian) rule-based; làm lại, xóa ngay lập tức; toggle chia sẻ với chuyên gia (lưu, chưa có người tiêu thụ cho tới GĐ2); "làm thử không lưu" | T20 |
| US-NRG-03 | SHOULD, làm | Check-in 1 chạm thang 1-5 + cảm xúc + ghi chú; lịch sử, biểu đồ tuần; nhắc hằng ngày tùy chọn. Nhật ký ca nhân viên hoãn GĐ2 | T20 |
| US-LRN-01 | MUST | Khóa/chương/bài: video YouTube unlisted, audio Storage, văn bản Markdown, quiz, bài tập nộp; ghi danh miễn phí; tiến độ, tiếp tục học, hoàn thành; drip theo ngày từ 06:00 giờ VN; heartbeat 30 giây ghi giờ học | T21 |
| US-LRN-02 | MUST | Quiz trắc nghiệm chấm server, điểm đạt và số lần làm cấu hình theo bài; chứng nhận PDF có mã, trang `/cert/[code]` công khai không lộ email/SĐT; thu hồi được | T22 |
| US-LRN-03 | SHOULD, làm vì DoD S6 | Điểm (ghi danh, hoàn thành bài/khóa, chuỗi ngày) vào `commerce.point_transactions` chỉ earn; huy hiệu theo rule; bảng xếp hạng tuần theo phút học và chuỗi, có ẩn tên; streak challenge với 1 ngày nghỉ | T22 |
| US-LRN-05 | SHOULD, làm tối thiểu | Lộ trình = danh sách khóa theo persona + luân xa cần cân bằng từ cùng bảng quy tắc của NRG-01; trang `/learn/lo-trinh` | T20,T21 |
| US-MEM-05 | MUST | Chuỗi tự động: welcome (tài khoản mới, lead landing), nhắc học (bài mới mở, 3 ngày không học), nhắc challenge mỗi sáng, nhắc sự kiện 24h/1h; mẫu và chuỗi quản lý trong admin; opt-out theo kênh trong cài đặt; log gửi. Bỏ giỏ, sau lưu trú, sinh nhật, gia hạn để GĐ2 | T23 |
| US-EXP-01 | MUST | Form nhiều bước theo 9 nhóm với học vấn, chứng chỉ upload, năm kinh nghiệm, số khách, kinh nghiệm giảng dạy, câu hỏi thức tỉnh/đạo đức, video giới thiệu (link), người giới thiệu, cam kết; bảng chấm 5 tiêu chí PRD với trọng số, ngưỡng và điểm sàn từng tiêu chí cấu hình; trạng thái nộp, sàng lọc, phỏng vấn, thử nghiệm, duyệt, từ chối, tạm ngưng; lịch sử phỏng vấn | T24 |
| US-EXP-02 | MUST | Hồ sơ công khai: ảnh, nhóm, phương pháp, chứng chỉ đã xác minh (chỉ nhãn), câu chuyện, dịch vụ và giá tham khảo, khóa, sự kiện; lọc nhóm, hình thức, ngôn ngữ, khoảng giá; cam kết đạo đức công khai. Không có "còn lịch 7 ngày", không đánh giá, không nút đặt lịch (GĐ2) | T24 |
| US-EVT-01 | MUST | Sự kiện workshop, webinar, nghi lễ trăng, healing circle, mini retreat, Energy Tour; online hoặc tại điểm; sức chứa, miễn phí (giá > 0 bị từ chối tới GĐ2), đăng ký, danh sách chờ tự lên, nhắc 24h/1h, QR check-in, điểm danh; sau sự kiện: đánh giá, tài liệu, link ghi hình | T25 |
| US-COM-01 | MUST | Nhóm công khai/riêng, nhóm tự động theo khóa và sự kiện; bài có ảnh, bình luận, "cảm ơn", báo cáo; kiểm duyệt: từ khóa chặn, hàng đợi duyệt bài của thành viên mới, khóa tài khoản | T26 |
| US-COM-02 | SHOULD, làm phần cây | Cây tâm nguyện: điều ước ẩn danh, lọc theo điểm, kiểm duyệt trước khi treo. Nhật ký hành trình riêng hoãn (check-in NRG-03 đã có ghi chú) | T26 |
| US-CNT-03 | MUST | Landing từ khối allowlist (hero, lợi ích, chứng thực có nguồn, form, FAQ, CTA, đếm ngược); form email/SĐT có consent; quà tặng ebook (file) hoặc mini-course (ghi danh); gắn tag CRM; kích hoạt chuỗi welcome; UTM lưu vào lead và PostHog | T27 |
| US-CNT-04 | SHOULD | Hoãn: không xây player podcast. Thiền dẫn miễn phí xuất bản dưới dạng bài audio trong khóa miễn phí | - |
| US-ADM-01 (GĐ1+) | MUST | Dashboard thêm: học viên, giờ học, tỷ lệ hoàn thành, chuyên gia công khai, sự kiện/đăng ký/điểm danh, lead theo landing | T28 |
| US-ADM-02 (GĐ1) | MUST | Timeline CRM thêm ghi danh/hoàn thành, sự kiện, lead/landing; không hiển thị hồ sơ năng lượng | T28 |
| Hardening S8 | PRD 8 | Rate limit mọi endpoint public mới; 2FA admin đã có; kiểm thử IDOR/RLS giữa hai thành viên; checklist ASVS L1; SEO Course/Event/Person, sitemap, llms; PostHog theo consent; nộp hồ sơ VNPay/MoMo là việc kinh doanh, plan chỉ cung cấp checklist | T28 |

## 4. Hồ sơ năng lượng

- Bộ câu hỏi là dữ liệu: `energy.quiz_definitions(code, version, questions, scoring_rules, recommendation_rules, status)`. Chỉ một version `active` tại một thời điểm; hồ sơ lưu `quiz_version` đã dùng. Sửa bộ câu hỏi tạo version mới, không sửa version đã có hồ sơ.
- Câu hỏi: `{id, kind: single|multi|scale|chakra, text, hint, options[{id, label, weights{persona, chakra}}]}`; scale có `lo/hi/labels`; chakra chọn trên hình người 7 vùng. Chấm điểm: cộng trọng số theo lựa chọn ra `persona_scores` (7 persona theo prompt thiết kế) và `chakra_scores` 0-100 cho 7 luân xa; persona = max; "cần cân bằng" = 2 luân xa thấp nhất. Quy tắc gợi ý: `[{if:{persona?, lowChakra?, goal?}, then:{kind: course|product|expert|space, ref: slug, why}}]`, lấy 3 dòng khớp đầu tiên theo thứ tự, chỉ trỏ tới đối tượng đã published; thiếu thì bỏ dòng, không bịa.
- Đồng ý: `consent_records.purpose` thêm `sensitive_energy` (bắt buộc trước khi lưu), `research` (tùy chọn, cho báo cáo ẩn danh), `share_experts` (toggle). Phiên bản văn bản đồng ý lấy từ CMS page `dong-y-du-lieu-nhay-cam` đã published; chưa published thì quiz chỉ chạy chế độ "làm thử không lưu".
- "Làm thử không lưu": chấm điểm trên client bằng cùng hàm trong `packages/core/src/energy/score.ts`, không gửi câu trả lời lên server; hiện kết quả với nhãn "bản thử, chưa lưu".
- Lưu trữ: `energy.profiles(user_id pk, quiz_version, persona, chakra_scores, goals, low_chakras, answers_enc bytea, computed_at, share_with_experts, deleted_at)`. `answers_enc` mã hóa bằng `pgp_sym_encrypt` với khóa trong Vault `energy_answers_key`; chỉ `energy.my_profile()` giải mã cho chủ sở hữu. Không staff policy. Xóa = xóa cứng dòng + ghi audit metadata (user, thời điểm), đồng thời xóa check-in nếu người dùng chọn.
- Check-in: `energy.checkins(user_id, at, score 1-5, mood, note, context daily|stay|event|course, ref_id)`; mỗi ngày nhiều lần được, biểu đồ lấy trung bình ngày. Nhắc hằng ngày là một sequence (T23) người dùng tự bật.
- Báo cáo ẩn danh (W-130): `energy.report(p_from, p_to)` trả phân bố persona và trung bình cảm xúc theo tháng, chỉ tính người có consent `research` còn hiệu lực, chỉ trả nhóm có n ≥ 20; cần `energy.report`.
- Copy bắt buộc: "Hồ sơ năng lượng mang tính hỗ trợ tinh thần, không phải chẩn đoán và không thay thế tư vấn y khoa." Không dùng "điều trị", "chữa bệnh".

## 5. LMS v1

- Khóa: `learn.courses(entity_id, slug, title, level short|intermediate|advanced|exclusive, format self|drip|challenge, price bigint default 0, is_premium=false, status, cover_media_id, energy_card_id, teacher_expert_id?, teacher_name, tags, summary_md, outcomes[])`. GĐ1 `price` phải = 0 để publish; cột có sẵn cho GĐ2. Chương `learn.sections`, bài `learn.lessons(kind video|audio|text|quiz|assignment, content jsonb, media_id?, duration_s, position, drip_day, is_preview, quiz_pass_pct, quiz_max_attempts)`.
- Nội dung public của bài không chứa đáp án quiz; projection `learn.lesson_public` lọc `correct`. Video chỉ nhúng `youtube-nocookie` từ URL YouTube hợp lệ (reuse kiểm tra của Energy Card). Audio là file trong bucket private `learn-media` (≤50MB, mime audio/*), phát qua signed URL 1 giờ cấp sau khi server kiểm ghi danh và drip; không tự host video.
- Ghi danh: `learn.enrollments(user_id, course_id, cohort_id?, source free|scholarship|premium|paid, started_at, completed_at, progress_pct, version)` unique (user, course). Ghi danh miễn phí qua RPC `learn.enroll_free(course_slug)`: cần đăng nhập + email đã xác minh + khóa published + price = 0. Không tạo `commerce.orders` cho khóa miễn phí (ruling: order chỉ khi có tiền, GĐ2 thêm `kind = course`).
- Drip: bài mở khi `now() >= start_date + drip_day ngày, 06:00 Asia/Ho_Chi_Minh`; `start_date` = ngày ghi danh (self/drip) hoặc ngày cohort bắt đầu (challenge). Server từ chối tiến độ/heartbeat cho bài chưa mở (`FORBIDDEN`, copy "Bài sẽ mở lúc 06:00 ngày ...").
- Tiến độ: `learn.lesson_progress(enrollment_id, lesson_id, status, seconds, completed_at, last_at)`. Heartbeat `learn.heartbeat(lesson_id, idempotency uuid)` mỗi 30 giây từ player, server cộng tối đa 45 giây mỗi lần, chỉ khi bài đang mở; giờ học KPI = tổng `seconds`. Hoàn thành bài: text khi bấm, video/audio khi ≥80% thời lượng hoặc bấm, quiz khi đạt, assignment khi đã nộp. Khóa hoàn thành khi 100% bài bắt buộc; `completed_at` tạo chứng nhận và điểm.
- Quiz: `learn.submit_quiz(lesson_id, answers)` chấm server, lưu `learn.quiz_attempts(score_pct, passed, attempt_no)`, từ chối vượt `quiz_max_attempts`. Assignment: `learn.assignments(lesson_id, enrollment_id, body_md, media_id?, submitted_at, feedback_md, feedback_by, feedback_at)`; file ≤10MB bucket private `learn-submissions`; giảng viên/editor phản hồi.
- Challenge: `learn.cohorts(course_id, slug, starts_on, ends_on, reminder_hour=6)`; ghi danh challenge gắn cohort; streak tính theo ngày có hoàn thành bài trong cohort, cho phép 1 ngày nghỉ không gãy chuỗi; huy hiệu "7 ngày thiền" khi đủ 7/7 bài; bảng xếp hạng tuần theo cohort: phút học rồi chuỗi, không theo chi tiêu; `profiles.leaderboard_visible` mặc định true, tắt trong cài đặt.
- Điểm và huy hiệu: `commerce.point_transactions(user_id, kind earn|redeem|expire|adjust, points, source_type, source_id, expires_at, entity_id)` append-only, unique (kind, source_type, source_id) chống cộng hai lần; GĐ1 chỉ `earn`. Quy tắc trong `runtime_settings points.rules` với fixture prototype: ghi danh 50, hoàn thành bài 10, hoàn thành khóa 150, challenge 7 ngày 100; hạn 12 tháng. Đây là fixture, chưa phải chính sách duyệt; không hiển thị "100 điểm = 10.000 đ" cho tới GĐ3. `learn.badges(code, name, rule jsonb)`, `learn.user_badges`.
- Chứng nhận: `learn.certificates(enrollment_id unique, code, issued_at, revoked_at, snapshot{display_name, course_title, teacher, hours, issued_on})`; mã `ZSOPO-CERT-YYMM-NNNN`; PDF sinh server bằng pdf-lib nhúng font Be Vietnam Pro, lưu bucket private `certificates`, tải qua signed URL cho chủ sở hữu; `/cert/[code]` công khai chỉ tên hiển thị, khóa, giảng viên, ngày, thời lượng, trạng thái. Tên trên chứng nhận lấy `profiles.display_name` tại thời điểm cấp; đổi tên sau không đổi chứng nhận đã cấp, cấp lại cần admin.
- 4 khóa miễn phí theo kế hoạch nội dung (Thiền 10 ngày, Luật hấp dẫn 101, Nhân số/Tarot cơ bản, Cân bằng năng lượng) là nội dung do giảng viên/biên tập soạn trong admin; seed chỉ có cấu trúc mẫu cho local, `seed-validate --production` từ chối bài có nội dung placeholder.
- Disclaimer "Nội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa" trên trang khóa và player. Không hiện rating/số học viên giả; số học viên hiện khi ≥ 10 ghi danh thật.

## 6. Chuyên gia

- Nhóm: healer (trị liệu năng lượng), tarot, astrology, numerology, fengshui, regression (thôi miên hồi quy), sound (sound healing), meditation, coach/psychology. Bộ câu hỏi riêng theo nhóm lấy từ DOCX (ví dụ tarot ≥100 khách, astrology ≥200 bản đồ, numerology ≥300 hồ sơ, healer ≥2-3 năm và 50-100 người, tâm lý ≥2 năm và bằng cấp); ngưỡng là dữ liệu cấu hình `expert.disciplines(code, name, min_years, min_clients, questions jsonb)`, không hard-code.
- Ứng tuyển: `expert.applications(user_id, discipline, answers jsonb, documents uuid[], intro_video_url, references jsonb, ethics_accepted_at, stage, rubric_version, scores jsonb, total, reviewer_id, notes, created_at, version)`; `expert.application_events(application_id, from_stage, to_stage, actor, note, at)` append-only cho lịch sử phỏng vấn/thử nghiệm. Một người chỉ có một hồ sơ mở mỗi nhóm; nộp lại sau từ chối cần 90 ngày (cấu hình).
- Chấm điểm: `expert.rubrics(version, criteria[{code: knowledge|practice|awakening|ethics|teaching, label, weight, min}], threshold)`. Fixture từ prototype: 5 tiêu chí thang 5, ngưỡng tổng 18/25, không tiêu chí nào dưới 3. Trọng số 6 tiêu chí trong DOCX mục V là ví dụ; chủ nội dung chốt rubric v1 trước khi duyệt hồ sơ thật. Điểm lưu kèm người chấm; chuyển sang `approved` yêu cầu `expert.approve` (aal2) và tổng đạt ngưỡng; từ chối phải có lý do; `suspended` ẩn hồ sơ công khai ngay.
- Duyệt tạo `expert.experts(user_id unique, slug, display_name, disciplines[], bio_md, story_md, methods[], languages[], formats online|offline|at_location, verified_credentials[{name, issuer, year}], ethics_accepted_at, status draft|published|suspended, commission_rule_id null)` và cấp role `expert`. Chứng chỉ gốc ở bucket private `expert-docs`, công khai chỉ nhãn đã xác minh do reviewer đánh dấu. `expert.services(expert_id, name, duration_min, price, format, description)` hiển thị giá tham khảo, không đặt lịch.
- Sửa hồ sơ công khai qua `expert.profile_drafts` (giống `post_drafts`), editor có `expert.profile_review` duyệt trong 24 giờ; không có "đã xác minh" nếu chưa có ít nhất một chứng chỉ xác minh hoặc reviewer đánh dấu xác minh kinh nghiệm.
- Trang công khai: `/chuyen-gia` (lọc nhóm, hình thức, ngôn ngữ, khoảng giá), `/chuyen-gia/[slug]`, JSON-LD Person; cam kết đạo đức công khai: "không tạo phụ thuộc, không gieo sợ hãi, không hứa kết quả, không thay thế y khoa". Studio tối thiểu `/studio`: trạng thái ứng tuyển, sửa hồ sơ, sự kiện được gán.

## 7. Sự kiện

- `events.events(entity_id, location_id?, host_expert_id?, slug, title, kind workshop|webinar|moon_ritual|healing_circle|mini_retreat|energy_tour, format online|at_location, starts_at, ends_at, timezone, capacity, price bigint default 0, status draft|published|cancelled|done, description_md, agenda jsonb, energy_card_id?, meet_url (private), cover_media_id, recording_url?, materials jsonb)`; publish từ chối `price > 0` (copy "Vé trả phí mở ở giai đoạn sau"). `location_id` tham chiếu `core.locations` đơn giản (điểm Space có thể khác entity khi Connect tách pháp nhân sau).
- Đăng ký: `events.registrations(event_id, user_id, state registered|waitlisted|cancelled|checked_in|no_show, position, qr_token_hash, checked_in_at, checked_in_by, rating, review, created_at)` unique (event, user). RPC `events.register(event_slug)` khóa dòng sự kiện, đếm `registered + checked_in` so với capacity, thừa thì `waitlisted` với `position`; hủy trước giờ bắt đầu tự đẩy người chờ đầu tiên lên và gửi thông báo. Cần đăng nhập + email xác minh.
- Nhắc 24h và 1h qua outbox kind `event.reminder` (render tại thời điểm gửi: bỏ qua nếu đã hủy/đổi giờ; link Meet chỉ trong tin gửi cho người đã đăng ký, không in ra trang public). Vé: `/toi/ve` hiện QR từ token 256-bit (hash trong DB); check-in bởi host hoặc staff có `event.checkin` tại điểm bằng quét mã hoặc nhập 6 ký tự cuối; một mã một lần.
- Sau sự kiện: trạng thái `done` mở đánh giá 1-5 + nhận xét cho người đã check-in (online: người registered), tài liệu/ghi hình chỉ cho người đăng ký. Điểm danh sự kiện không cộng điểm GĐ1 (chưa có quy tắc duyệt).
- Nhóm cộng đồng tự tạo khi publish (T26). JSON-LD Event với `offers` miễn phí, `eventAttendanceMode`.

## 8. Cộng đồng v1

- `community.groups(slug, name, kind public|private|course|event, ref_id?, rules_md, owner_id, status)`, `community.memberships(group_id, user_id, role member|moderator|owner, state active|pending|banned)`, `community.posts(group_id, author_id, body_md, media_ids[], status pending|published|removed|rejected, thanks_count, comments_count, version)`, `community.comments`, `community.thanks(post_id|comment_id, user_id)` unique, `community.reports(target_type, target_id, reporter_id, reason, status open|kept|removed, resolved_by, note)`, `community.blocked_keywords(term, action reject|review)`, `community.sanctions(user_id, kind warn|mute|suspend, until, reason, by)`.
- Nhóm theo khóa/sự kiện: tạo khi publish, thành viên tự vào khi ghi danh/đăng ký; nhóm riêng cần duyệt vào. Nhóm VIP là GĐ2.
- Kiểm duyệt: thành viên có dưới 3 bài đã duyệt thì bài vào `pending`; từ khóa `reject` chặn ngay với gợi ý sửa, `review` đưa vào hàng đợi; người bị `suspend` không đăng/bình luận; báo cáo ẩn danh với người bị báo cáo; moderator xử lý trong hàng đợi `/admin/cong-dong` với lý do. Xóa bài là `removed` giữ lịch sử.
- Ảnh bài viết: bucket public `community-media` có kiểm mime/kích thước và strip EXIF, alt bắt buộc. Markdown dùng cùng renderer an toàn của CMS (không HTML thô, không nhúng ngoài YouTube).
- Cây tâm nguyện: `community.wishes(text ≤140, location_id?, user_id? (không bao giờ xuất ra public projection), status pending|shown|removed)`; public chỉ thấy `shown`; từ khóa lọc; giới hạn 3 điều ước/ngày/người; khách chưa đăng nhập được gửi với rate limit theo IP.
- Rate limit theo user: bài 10/giờ, bình luận 60/giờ, báo cáo 20/ngày.

## 9. Landing và lead magnet

- `content.landing_pages(slug, title, blocks jsonb, status, published_at, lead_magnet jsonb, sequence_code, seo jsonb, version)` + `content.landing_revisions`. Khối allowlist: `hero`, `benefits`, `testimonials`, `lead_form`, `faq`, `cta`, `countdown`; mỗi khối có schema Zod; `testimonials` bắt buộc `source` (tên + ngữ cảnh thật) và cờ `approved` do biên tập xác nhận, không có thì không publish. `countdown` cần `ends_at` thật.
- Form: tên, email hoặc SĐT, consent bắt buộc (`purpose = marketing` + `lead_magnet`), rate limit theo IP, honeypot. `content.leads(landing_id, name, email, phone, normalized contacts, utm jsonb, referrer, consent_at, customer_id, magnet_state pending|sent|failed, created_at)`. Tạo `core.customers` mới với `source = landing:<slug>` và tag CRM `landing:<slug>`; trùng email/SĐT với khách cũ chỉ là gợi ý gộp, không tự nối.
- Quà: `kind = file` gửi email có signed URL 7 ngày từ bucket private `lead-magnets`; `kind = course` gửi email mời tạo ZSOPO ID (hoặc đăng nhập) với link ghi danh tự động vào khóa đó. Trang cảm ơn `/l/[slug]/cam-on` không lộ dữ liệu người khác, có nút tải (file) và gửi lại email (rate limit 1/ngày).
- Chuỗi welcome bắt đầu theo `sequence_code`; lead không có email chỉ nhận qua Zalo khi OA có, nếu không thì sequence ghi `disabled` như GĐ0.
- UTM: lưu trên lead, kèm event PostHog `lead_captured`; không gửi email/SĐT vào PostHog.

## 10. Chuỗi tự động và thông báo

- `ops_config.sequences(code, name, trigger account.created|lead.captured|enrollment.created|checkin.opt_in|course.inactive_3d|cohort.daily, steps jsonb [{offset_minutes | at_hour, template, channel email|zalo|inapp, stop_if}], status)`; `core.sequence_runs(subject_type user|customer, subject_id, sequence_code, step, next_run_at, state active|done|stopped, context jsonb)` unique (subject, sequence, context_key). Cron 5 phút claim run đến hạn, kiểm `stop_if` (ví dụ đã học bài, đã hủy ghi danh, đã opt-out kênh), enqueue outbox với dedupe `seq:<run>:<step>`.
- Thông báo trong app: `core.notifications(user_id, kind, title, body, link, read_at)`; `/toi/thong-bao` và chuông ở header khi đăng nhập. Mọi outbox kind hướng tới member cũng ghi một dòng inapp.
- Cài đặt kênh: `core.notification_prefs(user_id, channel, category service|learning|community|marketing, enabled)`. Giao dịch (xác nhận đặt chỗ, chứng nhận, bảo mật) luôn gửi email; learning/community tắt được; marketing theo consent CRM. Zalo hiển thị "mở khi có Zalo OA".
- Mẫu quản trị tại `/admin/thong-bao` (mở rộng W-129): mẫu theo kênh với biến allowlist, chuỗi bật/tắt, log 24 giờ, gửi thử tới chính mình.

## 11. Quyền riêng tư và tài khoản

- Đăng ký: email + mật khẩu hoặc Google (đã có); bắt buộc xác minh email trước khi ghi danh/đăng ký/đăng bài. SĐT OTP và Zalo login hoãn theo D06. Màn liên kết lịch sử theo SĐT (W-37 "Chúng mình tìm thấy lịch sử") không làm: nối đơn cũ vẫn qua claim email đã xác minh của GĐ0.
- `/toi/cai-dat`: thông tin, đổi mật khẩu, bật 2FA tùy chọn cho member, chia sẻ hồ sơ năng lượng, hiển thị trên bảng xếp hạng, kênh thông báo, xuất dữ liệu (tạo `privacy_requests kind export`, staff xử lý trong 72 giờ, file gửi qua signed URL), xóa hồ sơ năng lượng và nhật ký (ngay lập tức), xóa tài khoản (tạo `privacy_requests kind deletion`; Edge `account-delete` chạy sau 72 giờ: xóa auth user, ẩn danh `profiles/customers`, giữ orders/ledger theo yêu cầu kế toán, xóa energy/checkins/posts chuyển "Thành viên đã rời"; người dùng có thể hủy yêu cầu trong 72 giờ).
- DPIA trước GĐ1 (PRD 9) là việc của pháp lý; spec cung cấp bản đồ dữ liệu nhạy cảm (mục 4, 11) và bằng chứng kiểm soát (RLS, mã hóa, xóa). Không mở quiz production khi chưa có văn bản đồng ý được duyệt.

## 12. Điều kiện hoàn thành GĐ1

- Mọi story MUST ở mục 3 có bằng chứng test (unit/pgTAP/integration/e2e) và UAT.
- Deny-case bắt buộc: thành viên A không đọc/sửa được hồ sơ năng lượng, tiến độ, chứng nhận, vé, thông báo của B; staff (kể cả super_admin) không đọc được `energy.profiles`/`checkins` cá nhân; expert không đọc hồ sơ ứng tuyển người khác; member không gọi được RPC admin; bài `pending` không xuất hiện public; bài chưa mở drip không lấy được nội dung/audio URL.
- Race: hai người đăng ký suất cuối sự kiện chỉ một `registered`; heartbeat lặp cùng idempotency không cộng giờ hai lần; hoàn thành khóa hai request cùng lúc chỉ một chứng nhận và một dòng điểm.
- Gate thực địa (không thể thay bằng seed): S4 100 hồ sơ năng lượng thật; S6 challenge thiền 7 ngày ≥500 người với giờ học ghi nhận; S7 30 hồ sơ ứng tuyển, 10 chuyên gia công khai, 2 workshop đăng ký qua web; S8 phát hành công khai 27/03 với 2.000 đăng ký tích lũy. Chưa đạt thì release note ghi "pending thực địa".
- Pháp lý duyệt văn bản đồng ý dữ liệu nhạy cảm và DPIA; chủ nội dung duyệt rubric chuyên gia v1, bộ câu hỏi quiz v1, quy tắc điểm fixture; 4 khóa có nội dung thật trước khi mở Learn công khai.
- Ngưỡng chất lượng `04-seo-quality.md` áp dụng cho template mới: `/learn/[slug]`, `/chuyen-gia/[slug]`, `/su-kien/[slug]`, `/l/[slug]`; Lighthouse SEO ≥95 trên trang khóa và sự kiện.
