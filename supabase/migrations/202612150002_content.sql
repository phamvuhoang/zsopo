-- T14: editorial CMS (posts, immutable revisions, scheduling, redirects), Vietnamese accent-insensitive search,
-- campaign calendar, contact leads, newsletter with consent, public media bucket.

create table content.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort int not null default 0
);

create table content.posts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text not null default '',
  body_md text not null default '',
  cover_media_id uuid,
  category_id uuid references content.categories(id),
  author_id uuid references auth.users(id),
  author_name text not null default 'Ban biên tập ZSOPO',
  status text not null default 'draft' check (status in ('draft','review','scheduled','published','archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  seo jsonb not null default '{}',
  cta jsonb,
  reading_minutes int not null default 1,
  search_tsv tsvector,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or published_at is not null)
);
create index posts_search on content.posts using gin (search_tsv);
create index on content.posts (status, published_at desc);

create function content.vn_tsv(p text) returns tsvector language sql immutable set search_path = '' as $$
  select to_tsvector('simple', extensions.unaccent('extensions.unaccent', lower(coalesce(p, ''))))
$$;

create function content.post_derive() returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_tsv := setweight(content.vn_tsv(new.title), 'A') || setweight(content.vn_tsv(new.excerpt), 'B') || setweight(content.vn_tsv(new.body_md), 'C');
  new.reading_minutes := greatest(1, ceil(array_length(regexp_split_to_array(trim(new.body_md), '\s+'), 1) / 200.0)::int);
  return new;
end $$;
create trigger post_derive before insert or update of title, excerpt, body_md on content.posts for each row execute function content.post_derive();
-- Every write bumps version (optimistic lock); updated_at is the public "last updated", so only live content changes move it.
create function content.post_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  if content.snapshot_post(new) is distinct from content.snapshot_post(old) or new.status is distinct from old.status then new.updated_at := now(); end if;
  return new;
end $$;
create trigger touch before update on content.posts for each row execute function content.post_touch();

-- Pending edits of a published/scheduled post: invisible to the public until publish_content applies them.
create table content.post_drafts (
  post_id uuid primary key references content.posts(id),
  snapshot jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table content.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references content.posts(id),
  version int not null,
  snapshot jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (post_id, version)
);
create table content.page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references content.pages(id),
  version int not null,
  snapshot jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create trigger post_revisions_append_only before update or delete on content.post_revisions for each row execute function commerce.forbid_mutation();
create trigger page_revisions_append_only before update or delete on content.page_revisions for each row execute function commerce.forbid_mutation();

create table content.redirects (
  from_path text primary key,
  to_path text not null,
  created_at timestamptz not null default now(),
  check (from_path <> to_path)
);

create table content.campaign_calendar (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  week_start date not null,
  topic text not null,
  channel text not null,
  owner text,
  status text not null default 'idea' check (status in ('idea','draft','scheduled','done')),
  post_id uuid references content.posts(id),
  created_at timestamptz not null default now()
);

create table content.contact_leads (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  name text not null,
  email text,
  phone text,
  message text not null,
  consent_at timestamptz not null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table content.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  email text not null unique,
  status text not null default 'pending' check (status in ('pending','subscribed','unsubscribed')),
  consent_version text not null default 'v1',
  token_hash bytea not null,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ---------------------------------------------------------------- editorial RPCs
create function content.snapshot_post(p content.posts) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('slug', p.slug, 'title', p.title, 'excerpt', p.excerpt, 'body_md', p.body_md, 'category_id', p.category_id,
    'author_name', p.author_name, 'seo', p.seo, 'cta', p.cta, 'cover_media_id', p.cover_media_id)
$$;

-- Write a snapshot onto the live row (redirecting a changed slug of a post that was ever public).
create function content.apply_snapshot(p_post uuid, s jsonb, p_status text default null) returns void language plpgsql security definer set search_path = '' as $$
declare cur content.posts;
begin
  select * into cur from content.posts where id = p_post;
  if cur.published_at is not null and s ->> 'slug' <> cur.slug then
    insert into content.redirects(from_path, to_path) values ('/blog/' || cur.slug, '/blog/' || (s ->> 'slug'))
    on conflict (from_path) do update set to_path = excluded.to_path;
    update content.redirects set to_path = '/blog/' || (s ->> 'slug') where to_path = '/blog/' || cur.slug;
  end if;
  update content.posts set slug = s ->> 'slug', title = s ->> 'title', excerpt = coalesce(s ->> 'excerpt', ''), body_md = coalesce(s ->> 'body_md', ''),
    category_id = (s ->> 'category_id')::uuid, author_name = coalesce(s ->> 'author_name', author_name), seo = coalesce(s -> 'seo', '{}'),
    cta = nullif(s -> 'cta', 'null'::jsonb), cover_media_id = (s ->> 'cover_media_id')::uuid, updated_by = auth.uid(), status = coalesce(p_status, status)
  where id = p_post;
exception when unique_violation then
  perform core.fail('VALIDATION', 'Slug đã được dùng');
end $$;

-- An edit to a published/scheduled post waits in post_drafts; an unpublished post is edited in place (back to draft).
create function content.stage_post(cur content.posts, s jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  if cur.status in ('published','scheduled') then
    insert into content.post_drafts(post_id, snapshot, updated_by) values (cur.id, s, auth.uid())
    on conflict (post_id) do update set snapshot = excluded.snapshot, updated_by = excluded.updated_by, updated_at = now();
    update content.posts set updated_by = auth.uid() where id = cur.id;
  else
    perform content.apply_snapshot(cur.id, s, 'draft');
  end if;
end $$;

create function content.save_post(p jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare cur content.posts; v_id uuid := (p ->> 'id')::uuid; v_entity uuid := (p ->> 'entityId')::uuid; s jsonb;
begin
  if v_id is null then
    if not core.has_permission('content.write', v_entity, null) then perform core.fail('FORBIDDEN'); end if;
    insert into content.posts(entity_id, slug, title, excerpt, body_md, category_id, author_id, author_name, seo, cta, cover_media_id, updated_by)
    values (v_entity, p ->> 'slug', p ->> 'title', coalesce(p ->> 'excerpt', ''), coalesce(p ->> 'bodyMd', ''), nullif(p ->> 'categoryId', '')::uuid, auth.uid(),
            coalesce(nullif(p ->> 'authorName', ''), 'Ban biên tập ZSOPO'), coalesce(p -> 'seo', '{}'), p -> 'cta', nullif(p ->> 'coverMediaId', '')::uuid, auth.uid())
    returning * into cur;
    s := content.snapshot_post(cur);
  else
    select * into cur from content.posts where id = v_id for update;
    if not found or not core.has_permission('content.write', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
    if (p ->> 'expectedVersion')::int is distinct from cur.version then perform core.fail('VERSION_CONFLICT'); end if;
    s := coalesce((select d.snapshot from content.post_drafts d where d.post_id = cur.id), content.snapshot_post(cur)) || jsonb_strip_nulls(jsonb_build_object(
      'slug', p ->> 'slug', 'title', p ->> 'title', 'excerpt', p ->> 'excerpt', 'body_md', p ->> 'bodyMd', 'category_id', nullif(p ->> 'categoryId', ''),
      'author_name', nullif(p ->> 'authorName', ''), 'seo', p -> 'seo', 'cta', p -> 'cta', 'cover_media_id', nullif(p ->> 'coverMediaId', '')));
    perform content.stage_post(cur, s);
    select * into cur from content.posts where id = cur.id;
  end if;
  insert into content.post_revisions(post_id, version, snapshot, created_by) values (cur.id, cur.version, s, auth.uid());
  return cur.id;
exception when unique_violation then
  perform core.fail('VALIDATION', 'Slug đã được dùng');
end $$;

create function content.submit_review(p_post uuid) returns void language plpgsql security definer set search_path = '' as $$
declare cur content.posts;
begin
  select * into cur from content.posts where id = p_post for update;
  if not core.has_permission('content.write', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  update content.posts set status = 'review' where id = p_post and status = 'draft';
end $$;

-- Approve + publish now, or schedule (VN time) for content.publish_due.
create function content.publish_content(p_post uuid, p_expected_version int, p_scheduled_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cur content.posts;
begin
  select * into cur from content.posts where id = p_post for update;
  if not found or not core.has_permission('content.publish', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if cur.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  if exists (select 1 from content.post_drafts where post_id = p_post) then
    perform content.apply_snapshot(p_post, (select snapshot from content.post_drafts where post_id = p_post));
    delete from content.post_drafts where post_id = p_post;
    select * into cur from content.posts where id = p_post;
  end if;
  if coalesce(trim(cur.title), '') = '' or coalesce(trim(cur.body_md), '') = '' then perform core.fail('VALIDATION', 'Bài cần tiêu đề và nội dung'); end if;
  if p_scheduled_at is not null and p_scheduled_at > now() then
    update content.posts set status = 'scheduled', scheduled_at = p_scheduled_at where id = p_post returning * into cur;
  else
    update content.posts set status = 'published', published_at = coalesce(published_at, now()), scheduled_at = null where id = p_post returning * into cur;
  end if;
  perform core.audit(cur.entity_id, 'content.publish', 'post', cur.id::text, jsonb_build_object('status', cur.status, 'scheduled_at', cur.scheduled_at));
  return jsonb_build_object('status', cur.status, 'version', cur.version, 'slug', cur.slug);
end $$;

create function content.archive_post(p_post uuid) returns void language plpgsql security definer set search_path = '' as $$
declare cur content.posts;
begin
  select * into cur from content.posts where id = p_post for update;
  if not core.has_permission('content.publish', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  update content.posts set status = 'archived' where id = p_post;
end $$;

-- Restore = a NEW version carrying the old snapshot (history is never rewritten).
create function content.restore_revision(p_post uuid, p_revision uuid) returns int language plpgsql security definer set search_path = '' as $$
declare cur content.posts; s jsonb;
begin
  select * into cur from content.posts where id = p_post for update;
  if not core.has_permission('content.write', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  select snapshot into s from content.post_revisions where id = p_revision and post_id = p_post;
  if s is null then perform core.fail('NOT_FOUND'); end if;
  -- Restore keeps the current slug (no surprise redirects); like an edit, a published post gets it as a pending draft.
  s := s || jsonb_build_object('slug', coalesce((select d.snapshot ->> 'slug' from content.post_drafts d where d.post_id = p_post), cur.slug));
  perform content.stage_post(cur, s);
  select * into cur from content.posts where id = p_post;
  insert into content.post_revisions(post_id, version, snapshot, created_by) values (cur.id, cur.version, s, auth.uid());
  return cur.version;
end $$;

-- Cron: publish scheduled posts whose time has come, then ask the web app to revalidate.
create function content.publish_due() returns int language plpgsql security definer set search_path = '' as $$
declare v_n int; v_url text; v_secret text;
begin
  with due as (update content.posts set status = 'published', published_at = coalesce(published_at, now())
    where status = 'scheduled' and scheduled_at <= now() returning id)
  select count(*) into v_n from due;
  if v_n > 0 then
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'revalidate_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'revalidate_secret';
    if v_url is not null then
      perform net.http_post(url := v_url, headers := jsonb_build_object('x-revalidate-secret', v_secret, 'Content-Type', 'application/json'), body := '{"tags":["posts"]}'::jsonb);
    end if;
  end if;
  return v_n;
end $$;
select cron.schedule('publish-due', '* * * * *', 'select content.publish_due()');

-- Pages (policies/about) edits keep revisions too.
create function content.save_page(p_page uuid, p_title text, p_excerpt text, p_body text, p_expected_version int, p_publish boolean) returns int
language plpgsql security definer set search_path = '' as $$
declare cur content.pages;
begin
  select * into cur from content.pages where id = p_page for update;
  if not found or not core.has_permission('content.write', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if p_publish and not core.has_permission('content.publish', cur.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if cur.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  update content.pages set title = p_title, excerpt = p_excerpt, body_md = p_body, updated_by = auth.uid(),
    status = case when p_publish then 'published' else 'draft' end, published_at = case when p_publish then coalesce(published_at, now()) else published_at end,
    approved_by = case when p_publish then auth.uid() else approved_by end
  where id = p_page returning * into cur;
  insert into content.page_revisions(page_id, version, snapshot, created_by) values (cur.id, cur.version, to_jsonb(cur) - 'updated_at', auth.uid());
  return cur.version;
end $$;

-- ---------------------------------------------------------------- search (published projection only)
create function content.search_public(p_query text, p_kinds text[] default array['post','page','room','product'], p_page int default 1)
returns table(kind text, title text, url text, excerpt text, rank real) language sql stable security definer set search_path = '' as $$
  with q as (select plainto_tsquery('simple', extensions.unaccent('extensions.unaccent', lower(left(coalesce(p_query, ''), 100)))) as tsq)
  select * from (
    select 'post', p.title, '/blog/' || p.slug, p.excerpt, ts_rank(p.search_tsv, q.tsq) from content.posts p, q
      where 'post' = any(p_kinds) and p.status = 'published' and p.published_at <= now() and p.search_tsv @@ q.tsq
    union all
    select 'page', g.title, case g.kind when 'policy' then '/chinh-sach/' || g.slug else '/' || g.slug end, g.excerpt,
      ts_rank(content.vn_tsv(g.title || ' ' || g.excerpt || ' ' || g.body_md), q.tsq) from content.pages g, q
      where 'page' = any(p_kinds) and g.status = 'published' and content.vn_tsv(g.title || ' ' || g.excerpt || ' ' || g.body_md) @@ q.tsq
    union all
    select 'room', 'Phòng ' || r.name, '/stay/da-lat/phong/' || r.slug, r.description, ts_rank(content.vn_tsv(r.name || ' ' || r.room_type || ' ' || r.description), q.tsq) from stay.rooms r, q
      where 'room' = any(p_kinds) and r.status = 'published' and content.vn_tsv(r.name || ' ' || r.room_type || ' ' || r.description) @@ q.tsq
    union all
    select 'product', s.name, '/shop/' || s.slug, s.summary, ts_rank(content.vn_tsv(s.name || ' ' || s.summary || ' ' || s.origin), q.tsq) from shop.products s, q
      where 'product' = any(p_kinds) and s.status = 'published' and content.vn_tsv(s.name || ' ' || s.summary || ' ' || s.origin) @@ q.tsq
  ) x(kind, title, url, excerpt, rank)
  order by rank desc limit 20 offset (greatest(p_page, 1) - 1) * 20
$$;

-- ---------------------------------------------------------------- contact & newsletter
create function content.submit_contact(p_name text, p_email text, p_phone text, p_message text, p_consent boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_entity uuid := (select id from core.entities where code = 'ZS-SPACE');
begin
  perform core.rate_limit('contact', 5);
  if not content.policies_published() then perform core.fail('SOLD_OUT', 'Biểu mẫu tạm đóng'); end if;
  if not coalesce(p_consent, false) then perform core.fail('VALIDATION', 'Cần đồng ý chính sách bảo mật để gửi liên hệ'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_message, ''))) < 5 or (coalesce(p_email, '') = '' and coalesce(p_phone, '') = '') then
    perform core.fail('VALIDATION', 'Vui lòng nhập tên, nội dung và email hoặc số điện thoại');
  end if;
  insert into content.contact_leads(entity_id, name, email, phone, message, consent_at) values (v_entity, trim(p_name), nullif(lower(trim(p_email)), ''), nullif(trim(p_phone), ''), left(p_message, 3000), now())
  returning id into v_id;
  perform core.enqueue(v_entity, 'contact.received', 'contact.received:' || v_id, v_id, jsonb_build_object('name', trim(p_name)));
  return v_id;
end $$;

-- Double opt-in: the caller never gets a token. The confirmation email (token minted at render) goes to the mailbox;
-- an existing subscription keeps its token, and the reply is the same whether or not the email is known.
create function content.subscribe_newsletter(p_email text, p_consent boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_entity uuid := (select id from core.entities where code = 'ZS-SPACE'); v_email text := lower(trim(coalesce(p_email, ''))); n content.newsletter_subscriptions;
begin
  perform core.rate_limit('newsletter', 5);
  if not coalesce(p_consent, false) then perform core.fail('VALIDATION', 'Cần đồng ý nhận bản tin'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform core.fail('VALIDATION', 'Email không hợp lệ'); end if;
  insert into content.newsletter_subscriptions(entity_id, email, token_hash) values (v_entity, v_email, extensions.digest(extensions.gen_random_bytes(32), 'sha256'))
  on conflict (email) do nothing;
  select * into n from content.newsletter_subscriptions where email = v_email;
  if n.status <> 'subscribed' then
    -- At most one confirmation email per address per day.
    perform core.enqueue(n.entity_id, 'newsletter.confirm', 'newsletter.confirm:' || n.id || ':' || current_date, n.id, jsonb_build_object('email', v_email));
  end if;
end $$;

create function content.confirm_newsletter(p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update content.newsletter_subscriptions set status = 'subscribed', subscribed_at = now(), unsubscribed_at = null
  where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');
  if not found then perform core.fail('NOT_FOUND', 'Liên kết xác nhận không hợp lệ'); end if;
end $$;

create function content.unsubscribe_newsletter(p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update content.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = now() where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');
  if not found then perform core.fail('NOT_FOUND', 'Liên kết hủy không hợp lệ'); end if;
end $$;

-- ---------------------------------------------------------------- public media bucket (approved images with alt)
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and exists (select 1 from core.entities e where e.id::text = (storage.foldername(name))[1] and core.has_permission('content.write', e.id, null)));

-- ---------------------------------------------------------------- RLS & grants
alter table content.categories enable row level security;
alter table content.posts enable row level security;
alter table content.post_revisions enable row level security;
alter table content.page_revisions enable row level security;
alter table content.redirects enable row level security;
alter table content.campaign_calendar enable row level security;
alter table content.contact_leads enable row level security;
alter table content.newsletter_subscriptions enable row level security;
alter table content.post_drafts enable row level security;
grant select on content.categories, content.posts, content.redirects to anon, authenticated;
grant select on content.post_drafts, content.post_revisions, content.page_revisions, content.campaign_calendar, content.contact_leads, content.newsletter_subscriptions to authenticated;
grant insert, update on content.campaign_calendar, content.categories to authenticated;
grant update (handled_at) on content.contact_leads to authenticated;
grant all on all tables in schema content to service_role;
create policy categories_read on content.categories for select using (true);
create policy categories_write on content.categories for insert to authenticated with check (core.auth_has_role('super_admin', null, null) or exists (select 1 from core.user_roles ur where ur.user_id = auth.uid() and ur.role = 'editor' and ur.disabled_at is null));
create policy posts_read on content.posts for select using ((status = 'published' and published_at <= now()) or core.has_permission('content.write', entity_id, null));
create policy drafts_read on content.post_drafts for select to authenticated using (exists (select 1 from content.posts p where p.id = post_id and core.has_permission('content.write', p.entity_id, null)));
create policy revisions_read on content.post_revisions for select to authenticated using (exists (select 1 from content.posts p where p.id = post_id and core.has_permission('content.write', p.entity_id, null)));
create policy page_revisions_read on content.page_revisions for select to authenticated using (exists (select 1 from content.pages p where p.id = page_id and core.has_permission('content.write', p.entity_id, null)));
create policy redirects_read on content.redirects for select using (true);
create policy calendar_read on content.campaign_calendar for select to authenticated using (core.has_permission('content.write', entity_id, null));
create policy calendar_insert on content.campaign_calendar for insert to authenticated with check (core.has_permission('content.write', entity_id, null));
create policy calendar_update on content.campaign_calendar for update to authenticated using (core.has_permission('content.write', entity_id, null));
create policy leads_read on content.contact_leads for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy leads_update on content.contact_leads for update to authenticated using (core.has_permission('crm.write', entity_id, null));
create policy newsletter_read on content.newsletter_subscriptions for select to authenticated using (core.has_permission('crm.read', entity_id, null));

revoke execute on function content.vn_tsv, content.post_derive, content.snapshot_post, content.save_post, content.submit_review, content.publish_content, content.archive_post,
  content.restore_revision, content.publish_due, content.save_page, content.search_public, content.submit_contact, content.subscribe_newsletter, content.unsubscribe_newsletter,
  content.confirm_newsletter, content.apply_snapshot, content.stage_post, content.post_touch from public;
grant execute on function content.vn_tsv, content.search_public, content.submit_contact, content.subscribe_newsletter, content.unsubscribe_newsletter, content.confirm_newsletter to anon, authenticated;
grant execute on function content.save_post, content.submit_review, content.publish_content, content.archive_post, content.restore_revision, content.save_page to authenticated;
