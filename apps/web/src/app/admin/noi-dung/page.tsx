import { StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { importCalendarAction, publishPostAction, restoreAction, savePageAction, savePostAction, submitReviewAction, uploadMediaAction } from "@/features/content/actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Nội dung" };

const STATUS: Record<string, string> = { draft: "Nháp", review: "Chờ duyệt", scheduled: "Hẹn giờ", published: "Đã đăng", archived: "Lưu trữ" };

async function Editor({ searchParams }: Pick<PageProps<"/admin/noi-dung">, "searchParams">) {
  const ctx = await getStaffContext("/admin/noi-dung");
  await requirePermission("content.write", ctx.location.entity_id, null, "/admin/noi-dung");
  const sp = await searchParams;
  const db = await createClient();
  const [{ data: posts }, { data: cats }, { data: pages }, { data: pageDrafts }, { data: calendar }] = await Promise.all([
    db.schema("content").from("posts").select("id, slug, title, status, scheduled_at, version, updated_at").order("updated_at", { ascending: false }).limit(50),
    db.schema("content").from("categories").select("id, name").order("sort"),
    db.schema("content").from("pages").select("id, slug, title, excerpt, body_md, status, version").order("kind"),
    db.schema("content").from("page_drafts").select("page_id, title, excerpt, body_md"),
    db.schema("content").from("campaign_calendar").select("id, week_start, topic, channel, owner, status").order("week_start").limit(30),
  ]);
  const id = typeof sp.id === "string" ? sp.id : null;
  const { data: live } = id ? await db.schema("content").from("posts").select("*").eq("id", id).maybeSingle() : { data: null };
  const { data: draft } = id ? await db.schema("content").from("post_drafts").select("snapshot").eq("post_id", id).maybeSingle() : { data: null };
  // A published post's pending edits are shown in the editor; the public keeps the live version until "Duyệt và đăng".
  const post = live && { ...live, ...(draft?.snapshot as Partial<typeof live> | undefined) };
  const { data: revisions } = id ? await db.schema("content").from("post_revisions").select("id, version, created_at").eq("post_id", id).order("version", { ascending: false }) : { data: [] };
  return (
    <>
      <h1 className="text-2xl font-semibold">Nội dung</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="ds-bai">
          <h2 id="ds-bai" className="font-semibold">Bài viết <Link href="/admin/noi-dung" className="ml-2 text-sm underline">Bài mới</Link></h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {(posts ?? []).map((p) => (
              <li key={p.id}><Link href={`/admin/noi-dung?id=${p.id}`} className="flex flex-wrap items-center gap-2 rounded-md p-2 hover:bg-[var(--surface-2)]"><span>{p.title}</span><StatusBadge tone={p.status === "published" ? "success" : p.status === "scheduled" ? "info" : "neutral"}>{STATUS[p.status]}</StatusBadge></Link></li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="soan" className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 id="soan" className="font-semibold">{post ? `Sửa: ${post.title} (phiên bản ${post.version})` : "Bài mới"}</h2>
          {draft && <p className="mt-2 rounded-md bg-[var(--warning-soft)] p-2 text-sm">Có bản sửa chưa đăng. Bản công khai giữ nguyên cho tới khi bấm &quot;Duyệt và đăng&quot;.</p>}
          <ActionForm action={savePostAction} submit="Lưu nháp" className="mt-3 grid gap-2">
            {post && <input type="hidden" name="id" value={post.id} />}
            {post && <input type="hidden" name="version" value={post.version} />}
            <input type="hidden" name="entityId" value={ctx.location.entity_id} />
            <Field label="Tiêu đề"><input name="title" required defaultValue={post?.title} className={inputCls} /></Field>
            <Field label="Slug (không dấu; đổi slug bài đã đăng sẽ tạo chuyển hướng 301)"><input name="slug" defaultValue={post?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputCls} /></Field>
            <Field label="Tóm tắt"><textarea name="excerpt" defaultValue={post?.excerpt} className={inputCls} /></Field>
            <Field label="Danh mục"><select name="categoryId" defaultValue={post?.category_id ?? ""} className={inputCls}><option value="">Không</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Nội dung (Markdown an toàn, không HTML/MDX; dán URL YouTube trên một dòng để nhúng)"><textarea name="bodyMd" defaultValue={post?.body_md} rows={14} className={`${inputCls} py-2 font-mono`} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nút kêu gọi (nhãn)"><input name="ctaLabel" defaultValue={(post?.cta as { label?: string })?.label} className={inputCls} /></Field>
              <Field label="Nút kêu gọi (đường dẫn nội bộ)"><input name="ctaHref" defaultValue={(post?.cta as { href?: string })?.href} pattern="/.*" className={inputCls} /></Field>
            </div>
            <Field label="Tác giả"><input name="authorName" defaultValue={post?.author_name} className={inputCls} /></Field>
          </ActionForm>
          {post && (
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionForm action={submitReviewAction} submit="Gửi duyệt"><input type="hidden" name="id" value={post.id} /></ActionForm>
              <ActionForm action={publishPostAction} submit="Duyệt và đăng / hẹn giờ" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={post.id} /><input type="hidden" name="version" value={post.version} />
                <Field label="Hẹn giờ (giờ VN, để trống = đăng ngay)"><input name="scheduledAt" type="datetime-local" className={inputCls} /></Field>
              </ActionForm>
            </div>
          )}
          {post && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm underline">Xem trước (không lập chỉ mục)</summary>
              <div className="mt-2 rounded-md border border-[var(--line)] p-3"><Markdown source={post.body_md} /></div>
            </details>
          )}
          {(revisions ?? []).length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm underline">Lịch sử phiên bản</summary>
              <ul className="mt-2 text-sm">{(revisions ?? []).map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1">Phiên bản {r.version} · {new Date(r.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  <ActionForm action={restoreAction} submit="Khôi phục"><input type="hidden" name="id" value={post!.id} /><input type="hidden" name="revisionId" value={r.id} /></ActionForm>
                </li>))}</ul>
            </details>
          )}
        </section>
      </div>
      <section className="mt-10" aria-labelledby="trang">
        <h2 id="trang" className="text-lg font-semibold">Trang và chính sách</h2>
        <ul className="mt-2 flex flex-col gap-2">{(pages ?? []).map((live) => {
          // A published page's pending edit fills the form; the public keeps the live text until "Đăng" is ticked.
          const d = (pageDrafts ?? []).find((x) => x.page_id === live.id);
          const p = { ...live, ...d };
          return (
          <li key={p.id}><details className="rounded-md border border-[var(--line)] p-3"><summary className="cursor-pointer">{live.title} <StatusBadge>{STATUS[live.status]}</StatusBadge>{d && <> <StatusBadge tone="info">Có bản nháp chưa đăng</StatusBadge></>}</summary>
            <ActionForm action={savePageAction} submit="Lưu trang" className="mt-2 grid gap-2">
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="version" value={p.version} /><input type="hidden" name="slug" value={p.slug} />
              <Field label="Tiêu đề"><input name="title" defaultValue={p.title} className={inputCls} /></Field>
              <Field label="Tóm tắt"><input name="excerpt" defaultValue={p.excerpt} className={inputCls} /></Field>
              <Field label="Nội dung"><textarea name="body" defaultValue={p.body_md} rows={8} className={`${inputCls} py-2 font-mono`} /></Field>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="publish" defaultChecked={p.status === "published"} /> Đăng (cần quyền duyệt)</label>
            </ActionForm></details></li>);
        })}</ul>
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Thư viện ảnh</h2>
          <ActionForm action={uploadMediaAction} submit="Tải ảnh lên" className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="entityId" value={ctx.location.entity_id} />
            <Field label="Ảnh (JPEG/PNG/WebP/AVIF, tối đa 10MB)"><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></Field>
            <Field label="Mô tả ảnh (alt, bắt buộc)"><input name="alt" required className={inputCls} /></Field>
          </ActionForm>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lịch truyền thông</h2>
          <ActionForm action={importCalendarAction} submit="Nhập lịch" className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="entityId" value={ctx.location.entity_id} />
            <Field label="CSV: tuần (YYYY-MM-DD), chủ đề, kênh, người phụ trách"><textarea name="csv" rows={4} className={`${inputCls} py-2 font-mono`} /></Field>
          </ActionForm>
          <ul className="mt-2 text-sm">{(calendar ?? []).map((c) => <li key={c.id}>{c.week_start} · {c.channel} · {c.topic} · {c.owner} <StatusBadge>{c.status}</StatusBadge></li>)}</ul>
        </div>
      </section>
    </>
  );
}

export default function ContentAdmin(props: PageProps<"/admin/noi-dung">) {
  return <Suspense fallback={<p>Đang tải...</p>}><Editor searchParams={props.searchParams} /></Suspense>;
}
