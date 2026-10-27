-- Core: tenants, staff roles, customers, consent, media, energy cards, audit, outbox, guest capabilities.
create extension if not exists btree_gist;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema core;
create schema commerce;
create schema stay;
create schema shop;
create schema content;
create schema crm;
create schema ops_config;

grant usage on schema core, commerce, stay, shop, content, crm, ops_config to authenticated, service_role;
grant usage on schema core, stay, shop, content to anon; -- public projections only (RLS filtered)

-- Common trigger: bump updated_at/version.
create function core.touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

-- ---------------------------------------------------------------- tenants
create table core.entities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('holding','operating','nonprofit')),
  parent_entity_id uuid references core.entities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create table core.locations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','closed','test')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  check_in_time time not null default '14:00',
  check_out_time time not null default '12:00',
  address text,
  sellable_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id)
);
create trigger touch before update on core.locations for each row execute function core.touch();

-- ---------------------------------------------------------------- staff
create table core.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create trigger touch before update on core.profiles for each row execute function core.touch();

create table core.role_permissions (
  role text not null check (role in ('front_desk','housekeeping','location_manager','editor','ops_finance','super_admin')),
  action text not null,
  requires_aal2 boolean not null default false,
  primary key (role, action)
);

create table core.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('front_desk','housekeeping','location_manager','editor','ops_finance','super_admin')),
  entity_id uuid references core.entities(id),
  location_id uuid,
  granted_by uuid references auth.users(id),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (location_id, entity_id) references core.locations(id, entity_id),
  check (entity_id is not null or (role = 'super_admin' and location_id is null))
);
create unique index user_roles_active_uq on core.user_roles (user_id, role, coalesce(entity_id, '00000000-0000-0000-0000-000000000000'), coalesce(location_id, '00000000-0000-0000-0000-000000000000')) where disabled_at is null;
create index on core.user_roles (user_id) where disabled_at is null;

-- Current-role permission check: action + entity + optional location. Reads DB state on every call,
-- so a disabled role or profile is denied immediately even with an unexpired JWT.
create function core.has_permission(p_action text, p_entity uuid, p_location uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from core.user_roles ur
    join core.role_permissions rp on rp.role = ur.role and rp.action = p_action
    join core.profiles pr on pr.user_id = ur.user_id and pr.disabled_at is null
    where ur.user_id = auth.uid()
      and ur.disabled_at is null
      and ((ur.entity_id is null and ur.role = 'super_admin') or ur.entity_id = p_entity)
      and (ur.location_id is null or ur.location_id = p_location)
      and (not rp.requires_aal2 or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
  )
$$;

-- Plan interface name: auth_has_role(role, entity, location).
create function core.auth_has_role(p_role text, p_entity uuid, p_location uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.user_roles ur
    join core.profiles pr on pr.user_id = ur.user_id and pr.disabled_at is null
    where ur.user_id = auth.uid() and ur.disabled_at is null and ur.role = p_role
      and ((ur.entity_id is null and ur.role = 'super_admin') or ur.entity_id = p_entity)
      and (ur.location_id is null or ur.location_id = p_location)
  )
$$;

-- Entities/locations the caller is staff of (for list screens).
create function core.is_staff_of(p_entity uuid, p_location uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.user_roles ur
    join core.profiles pr on pr.user_id = ur.user_id and pr.disabled_at is null
    where ur.user_id = auth.uid() and ur.disabled_at is null
      and ((ur.entity_id is null and ur.role = 'super_admin') or ur.entity_id = p_entity)
      and (ur.location_id is null or p_location is null or ur.location_id = p_location)
  )
$$;

revoke execute on function core.has_permission, core.auth_has_role, core.is_staff_of from public;
grant execute on function core.has_permission, core.auth_has_role, core.is_staff_of to authenticated, anon, service_role;

-- ---------------------------------------------------------------- customers (CRM identity, independent of Auth)
create table core.customers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  user_id uuid references auth.users(id),
  display_name text not null,
  source text not null default 'web',
  merged_into uuid references core.customers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id)
);
create trigger touch before update on core.customers for each row execute function core.touch();
create index on core.customers (entity_id, created_at desc);

create table core.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  customer_id uuid not null,
  kind text not null check (kind in ('email','phone')),
  value text not null,
  normalized text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (customer_id, entity_id) references core.customers(id, entity_id) on delete cascade,
  unique (customer_id, kind, normalized)
);
create index on core.customer_contacts (entity_id, kind, normalized);

create table core.consent_records (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  customer_id uuid not null,
  purpose text not null check (purpose in ('terms','privacy','marketing','back_in_stock')),
  version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  source text not null default 'web',
  foreign key (customer_id, entity_id) references core.customers(id, entity_id) on delete cascade
);
create index on core.consent_records (customer_id, purpose);

create table core.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  customer_id uuid,
  kind text not null check (kind in ('export','correction','deletion')),
  status text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  due_at timestamptz not null default now() + interval '72 hours',
  notes text,
  created_at timestamptz not null default now(),
  foreign key (customer_id, entity_id) references core.customers(id, entity_id)
);

-- ---------------------------------------------------------------- media & energy cards
create table core.media (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  bucket text not null,
  path text not null,
  classification text not null check (classification in ('public','internal','evidence','identity','payment_evidence')),
  alt text,
  mime text not null,
  bytes int not null check (bytes > 0 and bytes <= 10485760),
  owner_id uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket, path),
  unique (id, entity_id),
  foreign key (location_id, entity_id) references core.locations(id, entity_id),
  check (classification <> 'public' or coalesce(alt, '') <> '')
);

-- Energy Card (US-NRG-02): shared by rooms, locations, products, services.
create table core.energy_cards (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  title text not null,
  purpose text not null,          -- công dụng
  origin text not null,           -- nguồn gốc
  usage text not null,            -- cách dùng / nghi lễ
  frequency text,                 -- tần số
  stones text[] not null default '{}',
  symbols text[] not null default '{}',
  chakras text[] not null default '{}' check (chakras <@ array['root','sacral','solar','heart','throat','third_eye','crown']),
  ritual_video_url text check (ritual_video_url is null or ritual_video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  bovis_reference int,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id)
);
create trigger touch before update on core.energy_cards for each row execute function core.touch();

-- ---------------------------------------------------------------- audit (append-only, redacted)
create table core.audit_logs (
  id bigint generated always as identity primary key,
  entity_id uuid references core.entities(id),
  actor_id uuid,
  action text not null,
  subject_type text not null,
  subject_id text,
  reason text,
  diff jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on core.audit_logs (entity_id, created_at desc);

create function core.redact(p jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k,
    case
      when k ~* '(phone|email|password|token|secret|document|cccd|cipher|key|address|note)' then to_jsonb('[redacted]'::text)
      when jsonb_typeof(v) = 'object' then core.redact(v)
      else v
    end), '{}'::jsonb)
  from jsonb_each(coalesce(p, '{}'::jsonb)) as e(k, v)
$$;

create function core.audit(p_entity uuid, p_action text, p_subject_type text, p_subject_id text, p_diff jsonb default '{}', p_reason text default null)
returns void language sql security definer set search_path = '' as $$
  insert into core.audit_logs(entity_id, actor_id, action, subject_type, subject_id, reason, diff)
  values (p_entity, auth.uid(), p_action, p_subject_type, p_subject_id, p_reason, core.redact(p_diff))
$$;
revoke execute on function core.audit from public, anon, authenticated;

-- ---------------------------------------------------------------- outbox
create table core.outbox (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references core.entities(id),
  dedupe_key text not null unique,
  kind text not null,
  aggregate_id uuid,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','dead','cancelled','disabled')),
  attempts int not null default 0,
  next_run_at timestamptz not null default now(),
  locked_until timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbox_due on core.outbox (next_run_at) where status in ('pending','processing');

create function core.enqueue(p_entity uuid, p_kind text, p_dedupe text, p_aggregate uuid, p_payload jsonb, p_run_at timestamptz default now())
returns uuid language sql security definer set search_path = '' as $$
  insert into core.outbox(entity_id, kind, dedupe_key, aggregate_id, payload, next_run_at)
  values (p_entity, p_kind, p_dedupe, p_aggregate, p_payload, p_run_at)
  on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id
$$;
revoke execute on function core.enqueue from public, anon, authenticated;

-- ---------------------------------------------------------------- guest capabilities (hash only)
create table core.guest_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  scope text not null check (scope in ('order','stay')),
  subject_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table core.entities enable row level security;
alter table core.locations enable row level security;
alter table core.profiles enable row level security;
alter table core.role_permissions enable row level security;
alter table core.user_roles enable row level security;
alter table core.customers enable row level security;
alter table core.customer_contacts enable row level security;
alter table core.consent_records enable row level security;
alter table core.privacy_requests enable row level security;
alter table core.media enable row level security;
alter table core.energy_cards enable row level security;
alter table core.audit_logs enable row level security;
alter table core.outbox enable row level security;
alter table core.guest_access_tokens enable row level security;

grant select on core.entities, core.locations, core.energy_cards, core.media to anon, authenticated;
grant select on core.profiles, core.role_permissions, core.user_roles, core.customers, core.customer_contacts,
  core.consent_records, core.privacy_requests, core.audit_logs, core.outbox to authenticated;
grant insert, update on core.energy_cards, core.media to authenticated;
grant update (display_name) on core.profiles to authenticated;
grant all on all tables in schema core to service_role;

create policy entities_read on core.entities for select using (true);
create policy locations_read on core.locations for select using (status = 'active' or core.is_staff_of(entity_id, id));
create policy profiles_read on core.profiles for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from core.user_roles ur where ur.user_id = profiles.user_id and core.has_permission('staff.manage', ur.entity_id, null)));
create policy profiles_update_own on core.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy role_permissions_read on core.role_permissions for select to authenticated using (true);
create policy user_roles_read on core.user_roles for select to authenticated
  using (user_id = auth.uid() or core.has_permission('staff.manage', entity_id, null));
create policy customers_read on core.customers for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy contacts_read on core.customer_contacts for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy consents_read on core.consent_records for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy privacy_read on core.privacy_requests for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy media_read on core.media for select
  using (classification = 'public' or (classification in ('internal','evidence') and core.is_staff_of(entity_id, location_id)));
create policy media_insert on core.media for insert to authenticated
  with check (classification in ('public','internal','evidence') and owner_id = auth.uid() and core.is_staff_of(entity_id, location_id));
create policy media_update on core.media for update to authenticated
  using (core.has_permission('content.write', entity_id, null)) with check (classification in ('public','internal','evidence'));
create policy energy_read on core.energy_cards for select using (status = 'published' or core.is_staff_of(entity_id));
create policy energy_write on core.energy_cards for insert to authenticated with check (core.has_permission('catalog.write', entity_id, null));
create policy energy_update on core.energy_cards for update to authenticated using (core.has_permission('catalog.write', entity_id, null));
create policy audit_read on core.audit_logs for select to authenticated using (core.has_permission('audit.read', entity_id, null));
create policy outbox_read on core.outbox for select to authenticated using (core.has_permission('notifications.read', entity_id, null));
-- guest_access_tokens: no policies (definer functions only).

-- ---------------------------------------------------------------- permission matrix
insert into core.role_permissions(role, action, requires_aal2) values
  ('front_desk','booking.read',false),('front_desk','booking.write',false),('front_desk','payment.record',false),
  ('front_desk','orders.read',false),('front_desk','service.manage',false),('front_desk','ticket.manage',false),
  ('front_desk','shift.manage',false),('front_desk','room.read',false),('front_desk','housekeeping.read',false),
  ('front_desk','identity.capture',false),('front_desk','identity.read',false),('front_desk','lostfound.manage',false),
  ('housekeeping','room.read',false),('housekeeping','housekeeping.work',false),('housekeeping','housekeeping.read',false),
  ('housekeeping','ticket.manage',false),('housekeeping','lostfound.manage',false),('housekeeping','supply.manage',false),
  ('location_manager','booking.read',false),('location_manager','booking.write',false),('location_manager','booking.exception',false),
  ('location_manager','payment.record',false),('location_manager','orders.read',false),('location_manager','service.manage',false),
  ('location_manager','ticket.manage',false),('location_manager','shift.manage',false),('location_manager','shift.amend',false),
  ('location_manager','room.read',false),('location_manager','room.manage',false),('location_manager','rate.manage',false),
  ('location_manager','calendar.manage',false),('location_manager','housekeeping.read',false),('location_manager','housekeeping.work',false),
  ('location_manager','inspection.approve',false),('location_manager','sop.manage',false),('location_manager','supply.manage',false),
  ('location_manager','lostfound.manage',false),('location_manager','lostfound.dispose',false),('location_manager','identity.read',false),
  ('location_manager','identity.capture',false),('location_manager','staff.manage',true),('location_manager','metrics.read',false),
  ('editor','content.write',false),('editor','content.publish',false),('editor','catalog.write',false),
  ('ops_finance','crm.read',false),('ops_finance','crm.write',false),('ops_finance','crm.export',true),('ops_finance','campaign.send',true),
  ('ops_finance','orders.read',false),('ops_finance','orders.manage',false),('ops_finance','booking.read',false),
  ('ops_finance','payment.record',false),('ops_finance','payment.confirm',true),('ops_finance','refund.approve',true),
  ('ops_finance','ledger.read',false),('ops_finance','ledger.export',true),('ops_finance','metrics.read',false),
  ('ops_finance','notifications.read',false),('ops_finance','notifications.manage',false),('ops_finance','inventory.manage',false),
  ('ops_finance','catalog.write',false),('ops_finance','audit.read',false);

-- super_admin gets every action defined for any role, plus system config.
insert into core.role_permissions(role, action, requires_aal2)
select distinct 'super_admin', action, true from core.role_permissions
union select 'super_admin', a, true from unnest(array['config.manage','audit.read','staff.manage']) a
on conflict do nothing;
