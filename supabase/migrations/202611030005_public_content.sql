-- Minimal public content for S0/S1: CMS pages (about, policies) and public runtime settings.
-- Full editorial workflow (posts, revisions, calendar) arrives in T14 and extends these tables.

create table content.pages (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null check (kind in ('page','policy')),
  title text not null,
  excerpt text not null default '',
  body_md text not null default '',
  status text not null default 'draft' check (status in ('draft','review','scheduled','published','archived')),
  published_at timestamptz,
  approved_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (status <> 'published' or published_at is not null)
);
create trigger touch before update on content.pages for each row execute function core.touch();

create table ops_config.runtime_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  entity_id uuid references core.entities(id),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create trigger touch before update on ops_config.runtime_settings for each row execute function core.touch();

alter table content.pages enable row level security;
alter table ops_config.runtime_settings enable row level security;

grant usage on schema ops_config to anon;
grant select on content.pages to anon, authenticated;
grant insert, update on content.pages to authenticated;
grant select on ops_config.runtime_settings to anon, authenticated;
grant all on all tables in schema content, ops_config to service_role;

create policy pages_public_read on content.pages for select
  using ((status = 'published' and published_at <= now()) or core.has_permission('content.write', entity_id, null));
create policy pages_insert on content.pages for insert to authenticated with check (core.has_permission('content.write', entity_id, null));
create policy pages_update on content.pages for update to authenticated using (core.has_permission('content.write', entity_id, null));
create policy settings_read on ops_config.runtime_settings for select
  using (is_public or core.has_permission('config.manage', entity_id, null));

-- Data collection gate: forms that collect personal data stay closed until privacy + terms are published.
create function content.policies_published() returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) = 2 from content.pages
  where slug in ('bao-mat','dieu-khoan') and status = 'published' and published_at <= now()
$$;
revoke execute on function content.policies_published from public;
grant execute on function content.policies_published to anon, authenticated;
