-- T05: policy versions, rate plans, quotes, bookings, the shared room allocation (anti double-booking),
-- quote/hold RPCs and the public availability calendar.

-- ---------------------------------------------------------------- errors & rate limit
-- Domain error: message = code (packages/api maps it), detail = Vietnamese copy, SQLSTATE PT<http> sets HTTP status.
create function core.fail(p_code text, p_detail text default null) returns void language plpgsql set search_path = '' as $$
declare v_http text := case p_code
  when 'VALIDATION' then '400' when 'UNAUTHENTICATED' then '401' when 'FORBIDDEN' then '403' when 'NOT_FOUND' then '404'
  when 'RATE_LIMITED' then '429' when 'UPSTREAM_UNAVAILABLE' then '503' else '409' end;
begin
  raise exception using message = p_code, detail = coalesce(p_detail, ''), errcode = 'PT' || v_http;
end $$;
grant execute on function core.fail to anon, authenticated;

create table core.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);
alter table core.rate_limits enable row level security;

-- Fixed-window limiter keyed by bucket + client IP from PostgREST request headers (shared across serverless instances).
create function core.rate_limit(p_bucket text, p_max int, p_window interval default interval '1 minute')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip text := coalesce(split_part(v_headers ->> 'x-forwarded-for', ',', 1), v_headers ->> 'cf-connecting-ip', 'local');
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  v_hits int;
  -- Local/staging can scale limits (seed sets 100x for automated tests); production keeps 1.
  v_scale int := coalesce((select (value #>> '{}')::int from ops_config.runtime_settings where key = 'rate_limit.scale'), 1);
begin
  insert into core.rate_limits(bucket, window_start, hits) values (p_bucket || ':' || v_ip, v_start, 1)
  on conflict (bucket, window_start) do update set hits = core.rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > p_max * v_scale then perform core.fail('RATE_LIMITED'); end if;
end $$;
revoke execute on function core.rate_limit from public, anon, authenticated;

-- ---------------------------------------------------------------- policy versions
create table ops_config.policy_versions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  kind text not null check (kind in ('stay','shop')),
  version int not null,
  params jsonb not null,
  summary_md text not null default '',
  effective_from timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (entity_id, location_id, kind, version),
  foreign key (location_id, entity_id) references core.locations(id, entity_id),
  check (kind <> 'stay' or ((params ->> 'deposit_rate_bp')::int between 3000 and 5000))
);
alter table ops_config.policy_versions enable row level security;
grant select on ops_config.policy_versions to anon, authenticated;
grant all on ops_config.policy_versions to service_role;
create policy policy_versions_read on ops_config.policy_versions for select using (true);

create function ops_config.current_policy(p_location uuid, p_kind text) returns ops_config.policy_versions
language sql stable security definer set search_path = '' as $$
  select * from ops_config.policy_versions
  where (location_id = p_location or (p_location is null and location_id is null)) and kind = p_kind and effective_from <= now()
  order by effective_from desc, version desc limit 1
$$;

-- Managers publish a new version (never edit an old one: bookings keep their snapshot).
create function ops_config.publish_stay_policy(p_location uuid, p_params jsonb, p_summary text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_entity uuid; v_id uuid; v_version int;
begin
  select entity_id into v_entity from core.locations where id = p_location;
  if not core.has_permission('rate.manage', v_entity, p_location) then perform core.fail('FORBIDDEN'); end if;
  select coalesce(max(version), 0) + 1 into v_version from ops_config.policy_versions where location_id = p_location and kind = 'stay';
  insert into ops_config.policy_versions(entity_id, location_id, kind, version, params, summary_md, created_by)
  values (v_entity, p_location, 'stay', v_version, p_params, p_summary, auth.uid()) returning id into v_id;
  perform core.audit(v_entity, 'policy.publish', 'policy_version', v_id::text, p_params);
  return v_id;
end $$;
revoke execute on function ops_config.current_policy, ops_config.publish_stay_policy from public;
grant execute on function ops_config.current_policy to anon, authenticated;
grant execute on function ops_config.publish_stay_policy to authenticated;

-- ---------------------------------------------------------------- rate plans
create table stay.rate_plans (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  kind text not null check (kind in ('base','weekday','season','date')),
  priority int generated always as (case kind when 'date' then 3 when 'season' then 2 when 'weekday' then 1 else 0 end) stored,
  dow int check (dow between 0 and 6),
  date_range daterange,
  price bigint not null check (price > 0),
  extra_adult_fee bigint not null default 0 check (extra_adult_fee >= 0),
  extra_child_fee bigint not null default 0 check (extra_child_fee >= 0),
  label text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id),
  check ((kind = 'weekday') = (dow is not null)),
  check ((kind in ('season','date')) = (date_range is not null and not isempty(date_range))),
  -- Same priority may not overlap: one base, one per weekday, non-overlapping seasons/dates.
  exclude using gist (room_id with =, kind with =, date_range with &&) where (active and kind in ('season','date'))
);
create unique index rate_plans_one_base on stay.rate_plans (room_id) where active and kind = 'base';
create unique index rate_plans_one_dow on stay.rate_plans (room_id, dow) where active and kind = 'weekday';
create trigger touch before update on stay.rate_plans for each row execute function core.touch();

-- Nightly prices with precedence date > season > weekday > base. Authority for all stay pricing.
create function stay.price_nights(p_room uuid, p_arrival date, p_departure date)
returns table(night date, price bigint, rate_kind text)
language sql stable security definer set search_path = '' as $$
  select n::date, r.price, r.kind
  from generate_series(p_arrival, p_departure - 1, interval '1 day') n
  cross join lateral (
    select rp.price, rp.kind from stay.rate_plans rp
    where rp.room_id = p_room and rp.active
      and (rp.kind = 'base'
        or (rp.kind = 'weekday' and rp.dow = extract(dow from n)::int)
        or (rp.kind in ('season','date') and rp.date_range @> n::date))
    order by rp.priority desc limit 1
  ) r
$$;

-- ---------------------------------------------------------------- shared allocation
create table stay.room_allocations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  occupied_range tstzrange not null,
  kind text not null check (kind in ('hold','booking','ota','maintenance')),
  source_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id),
  check (not isempty(occupied_range)),
  exclude using gist (room_id with =, occupied_range with &&) where (active)
);
create index on stay.room_allocations (room_id, source_id);

create table stay.room_blocks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  kind text not null check (kind in ('maintenance','ota','owner')),
  arrival date not null,
  departure date not null check (departure > arrival),
  reason text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id)
);

-- Local stay dates -> occupied instant range [arrival check-in, departure check-out) in the location timezone.
create function stay.stay_range(p_location uuid, p_arrival date, p_departure date) returns tstzrange
language sql stable security definer set search_path = '' as $$
  select tstzrange((p_arrival + l.check_in_time) at time zone l.timezone, (p_departure + l.check_out_time) at time zone l.timezone, '[)')
  from core.locations l where l.id = p_location
$$;

-- Release holds whose held_until passed (DB clock). Caller must hold the room lock.
create function stay.expire_room_holds(p_room uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  with expired as (
    update stay.bookings set state = 'expired' where room_id = p_room and state = 'held' and held_until <= now() returning id, order_id
  ), released as (
    update stay.room_allocations a set active = false, released_at = now()
    from expired e where a.source_id = e.id and a.active returning a.id
  ), orders as (
    update commerce.orders o set status = 'expired' from expired e where o.id = e.order_id and o.status = 'pending' returning o.id
  )
  select count(*) into v_count from expired;
  return v_count;
end $$;

-- Manual/OTA/maintenance block through the same lock + allocation. Returns block id, SOLD_OUT on overlap.
create function stay.block_room(p_room uuid, p_arrival date, p_departure date, p_kind text, p_reason text, p_source uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r stay.rooms; v_id uuid := coalesce(p_source, gen_random_uuid());
begin
  select * into r from stay.rooms where id = p_room for update;
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy phòng'); end if;
  if auth.uid() is not null and not core.has_permission('calendar.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  perform stay.expire_room_holds(p_room);
  if p_source is null then
    insert into stay.room_blocks(id, entity_id, location_id, room_id, kind, arrival, departure, reason, created_by)
    values (v_id, r.entity_id, r.location_id, p_room, p_kind, p_arrival, p_departure, p_reason, auth.uid());
  end if;
  begin
    insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
    values (r.entity_id, r.location_id, p_room, stay.stay_range(r.location_id, p_arrival, p_departure), case when p_kind = 'owner' then 'maintenance' else p_kind end, v_id);
  exception when exclusion_violation then
    perform core.fail('SOLD_OUT', 'Khoảng ngày đã có đặt phòng hoặc khóa lịch khác');
  end;
  if auth.uid() is not null then perform core.audit(r.entity_id, 'calendar.block', 'room', p_room::text, jsonb_build_object('kind', p_kind, 'arrival', p_arrival, 'departure', p_departure), p_reason); end if;
  return v_id;
end $$;

create function stay.release_block(p_block uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare b stay.room_blocks;
begin
  select * into b from stay.room_blocks where id = p_block and released_at is null for update;
  if not found then return; end if;
  if not core.has_permission('calendar.manage', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN'); end if;
  update stay.room_blocks set released_at = now() where id = p_block;
  update stay.room_allocations set active = false, released_at = now() where source_id = p_block and active;
  perform core.audit(b.entity_id, 'calendar.release', 'room', b.room_id::text, '{}'::jsonb, p_reason);
end $$;

-- ---------------------------------------------------------------- quotes & bookings
create table stay.quotes (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  arrival date not null,
  departure date not null,
  adults int not null,
  children_ages int[] not null default '{}',
  services jsonb not null default '[]',
  lines jsonb not null,
  subtotal bigint not null,
  discount bigint not null,
  total bigint not null,
  deposit_rate_bp int not null,
  deposit_due bigint not null,
  policy_version_id uuid not null references ops_config.policy_versions(id),
  version int not null default 1,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id)
);

create table stay.bookings (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  order_id uuid not null,
  room_id uuid not null,
  quote_id uuid references stay.quotes(id),
  arrival date not null,
  departure date not null check (departure > arrival),
  state text not null check (state in ('held','confirmed','checked_in','checked_out','expired','cancelled','no_show','needs_review')),
  held_until timestamptz,
  adults int not null check (adults > 0),
  children_ages int[] not null default '{}',
  arrival_time text,
  notes text,
  source text not null default 'web',
  policy_snapshot jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id),
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id),
  check (state <> 'held' or held_until is not null)
);
create trigger touch before update on stay.bookings for each row execute function core.touch();
create index on stay.bookings (location_id, arrival);
create index on stay.bookings (room_id, state);
create index on stay.bookings (order_id);

-- Quote: server-side price + policy snapshot, valid 10 minutes (policy param). Public, rate limited.
create function stay.quote_stay(p_room uuid, p_arrival date, p_departure date, p_adults int, p_children int[] default '{}', p_services jsonb default '[]')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r stay.rooms; pol ops_config.policy_versions; base stay.rate_plans;
  v_lines jsonb := '[]'; v_subtotal bigint := 0; v_discount bigint := 0; v_total bigint; v_deposit bigint;
  v_extra bigint; v_rate_bp int; v_quote uuid; v_expires timestamptz; n record; v_nights int;
begin
  perform core.rate_limit('quote', 60);
  if p_departure <= p_arrival then perform core.fail('VALIDATION', 'Ngày trả phòng phải sau ngày nhận phòng'); end if;
  if p_arrival < (now() at time zone 'Asia/Ho_Chi_Minh')::date then perform core.fail('VALIDATION', 'Ngày nhận phòng đã qua'); end if;
  if p_departure - p_arrival > 30 then perform core.fail('VALIDATION', 'Tối đa 30 đêm mỗi lần đặt'); end if;
  select * into r from stay.rooms where id = p_room and status = 'published';
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy phòng'); end if;
  if not r.sellable then perform core.fail('SOLD_OUT', 'Phòng chưa mở bán'); end if;
  if p_adults < 1 or p_adults + coalesce(array_length(p_children, 1), 0) > r.max_guests then
    perform core.fail('VALIDATION', format('Phòng tối đa %s khách', r.max_guests));
  end if;
  pol := ops_config.current_policy(r.location_id, 'stay');
  if pol.id is null then perform core.fail('SOLD_OUT', 'Điểm chưa có chính sách đặt phòng được duyệt'); end if;
  select * into base from stay.rate_plans where room_id = p_room and kind = 'base' and active;
  if not found then perform core.fail('SOLD_OUT', 'Phòng chưa có giá'); end if;

  v_extra := greatest(0, p_adults - r.capacity_adults) * base.extra_adult_fee
    + (select count(*) from unnest(p_children) a where a >= coalesce((pol.params ->> 'child_free_under_age')::int, 6)) * base.extra_child_fee;
  v_nights := 0;
  for n in select * from stay.price_nights(p_room, p_arrival, p_departure) loop
    v_nights := v_nights + 1;
    v_lines := v_lines || jsonb_build_object('title', 'Tiền phòng đêm ' || to_char(n.night, 'DD/MM/YYYY'), 'amount', n.price::text, 'kind', 'room_night', 'night', n.night);
    v_subtotal := v_subtotal + n.price;
    if v_extra > 0 then
      v_lines := v_lines || jsonb_build_object('title', 'Phụ thu khách thêm đêm ' || to_char(n.night, 'DD/MM/YYYY'), 'amount', v_extra::text, 'kind', 'extra_guest', 'night', n.night);
      v_subtotal := v_subtotal + v_extra;
    end if;
  end loop;
  if v_nights <> p_departure - p_arrival then perform core.fail('SOLD_OUT', 'Thiếu giá cho một số đêm'); end if;

  -- Services are added by stay.quote_services (T09); keep the hook explicit.
  select coalesce(sum((s ->> 'amount')::bigint), 0), coalesce(sum((s ->> 'discount')::bigint), 0), coalesce(jsonb_agg(s), '[]')
    into strict v_extra, v_discount, p_services
    from jsonb_array_elements(stay.quote_services(r.id, p_arrival, p_services)) s;
  v_subtotal := v_subtotal + v_extra;
  v_lines := v_lines || p_services;
  if v_discount > 0 then v_lines := v_lines || jsonb_build_object('title', 'Ưu đãi đặt trước dịch vụ', 'amount', (-v_discount)::text, 'kind', 'discount'); end if;

  v_total := v_subtotal - v_discount;
  v_rate_bp := (pol.params ->> 'deposit_rate_bp')::int;
  v_deposit := (v_total * v_rate_bp + 9999) / 10000;
  v_expires := now() + make_interval(mins => coalesce((pol.params ->> 'quote_ttl_minutes')::int, 10));
  insert into stay.quotes(entity_id, location_id, room_id, arrival, departure, adults, children_ages, services, lines, subtotal, discount, total, deposit_rate_bp, deposit_due, policy_version_id, expires_at)
  values (r.entity_id, r.location_id, p_room, p_arrival, p_departure, p_adults, p_children, p_services, v_lines, v_subtotal, v_discount, v_total, v_rate_bp, v_deposit, pol.id, v_expires)
  returning id into v_quote;

  return jsonb_build_object('id', v_quote, 'version', 1, 'total', v_total::text, 'subtotal', v_subtotal::text, 'discount', v_discount::text,
    'depositDue', v_deposit::text, 'depositRateBp', v_rate_bp, 'expiresAt', v_expires, 'lines', v_lines, 'policyVersion', pol.id,
    'policySummary', pol.summary_md, 'nights', v_nights);
end $$;

-- T09 replaces this with real service pricing; returns priced service lines [{title, amount, discount, ...}].
create function stay.quote_services(p_room uuid, p_arrival date, p_services jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if jsonb_array_length(coalesce(p_services, '[]')) > 0 then perform core.fail('VALIDATION', 'Dịch vụ đặt trước chưa mở'); end if;
  return '[]'::jsonb;
end $$;

-- Normalize contacts.
create function core.normalize_phone(p text) returns text language sql immutable set search_path = '' as $$
  select case when d like '84%' then '0' || substr(d, 3) else d end from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') d) x
$$;

-- Find or create a CRM customer from guest input. Contacts are recorded unverified; never links Auth by contact alone.
create function core.upsert_guest_customer(p_entity uuid, p_guest jsonb, p_source text, p_consents jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_phone text := core.normalize_phone(p_guest ->> 'phone'); v_email text := lower(trim(p_guest ->> 'email'));
begin
  insert into core.customers(entity_id, display_name, source, user_id)
  values (p_entity, trim(p_guest ->> 'name'), p_source, auth.uid()) returning id into v_customer;
  if v_phone <> '' then
    insert into core.customer_contacts(entity_id, customer_id, kind, value, normalized) values (p_entity, v_customer, 'phone', p_guest ->> 'phone', v_phone);
  end if;
  if coalesce(v_email, '') <> '' then
    insert into core.customer_contacts(entity_id, customer_id, kind, value, normalized) values (p_entity, v_customer, 'email', p_guest ->> 'email', v_email);
  end if;
  if coalesce((p_consents ->> 'terms')::boolean, false) then
    insert into core.consent_records(entity_id, customer_id, purpose, version, source) values
      (p_entity, v_customer, 'terms', coalesce(p_consents ->> 'version', 'v1'), p_source),
      (p_entity, v_customer, 'privacy', coalesce(p_consents ->> 'version', 'v1'), p_source);
  end if;
  if coalesce((p_consents ->> 'marketing')::boolean, false) then
    insert into core.consent_records(entity_id, customer_id, purpose, version, source) values (p_entity, v_customer, 'marketing', coalesce(p_consents ->> 'version', 'v1'), p_source);
  end if;
  return v_customer;
end $$;

-- Hold: booking + order + items + allocation in one transaction; TTL from the policy (30 min) on the DB clock.
create function stay.create_stay_hold(p_quote uuid, p_guest jsonb, p_policy_version uuid, p_idempotency uuid, p_consents jsonb,
  p_arrival_time text default null, p_notes text default null, p_source text default 'web')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q stay.quotes; r stay.rooms; pol ops_config.policy_versions; fresh jsonb; v_customer uuid; v_order uuid; v_booking uuid;
  v_code text; v_held timestamptz; v_hash text; v_result jsonb; l jsonb;
begin
  v_hash := md5(p_quote::text || coalesce(p_guest::text, '') || coalesce(p_consents::text, ''));
  v_result := commerce.idem_get('stay_hold', p_idempotency::text, v_hash);
  if v_result is not null then return v_result; end if;
  perform core.rate_limit('hold', 20);

  if not coalesce((p_consents ->> 'terms')::boolean, false) then perform core.fail('VALIDATION', 'Cần đồng ý điều khoản và chính sách bảo mật'); end if;
  if length(trim(coalesce(p_guest ->> 'name', ''))) < 2 then perform core.fail('VALIDATION', 'Vui lòng nhập họ tên'); end if;
  if core.normalize_phone(p_guest ->> 'phone') !~ '^0\d{9,10}$' then perform core.fail('VALIDATION', 'Số điện thoại không hợp lệ'); end if;
  if not content.policies_published() then perform core.fail('SOLD_OUT', 'Đặt phòng trực tuyến chưa mở'); end if;

  select * into q from stay.quotes where id = p_quote;
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy báo giá'); end if;
  if q.expires_at <= now() then perform core.fail('QUOTE_EXPIRED'); end if;

  -- Room lock serialises every writer of this room (web, staff, OTA import, maintenance).
  select * into r from stay.rooms where id = q.room_id for update;
  perform stay.expire_room_holds(r.id);
  if not r.sellable or r.status <> 'published' then perform core.fail('SOLD_OUT', 'Phòng chưa mở bán'); end if;
  pol := ops_config.current_policy(r.location_id, 'stay');
  if pol.id <> p_policy_version or q.policy_version_id <> pol.id then perform core.fail('PRICE_CHANGED', 'Chính sách đặt phòng vừa cập nhật. Vui lòng xem lại.'); end if;
  if (select coalesce(sum(price), 0) from stay.price_nights(r.id, q.arrival, q.departure)) <>
     (select coalesce(sum((x ->> 'amount')::bigint), 0) from jsonb_array_elements(q.lines) x where x ->> 'kind' = 'room_night') then
    perform core.fail('PRICE_CHANGED');
  end if;

  v_customer := core.upsert_guest_customer(r.entity_id, p_guest, p_source, p_consents);
  v_held := now() + make_interval(mins => coalesce((pol.params ->> 'hold_minutes')::int, 30));
  insert into commerce.orders(entity_id, location_id, customer_id, kind, status, subtotal, discount, total, deposit_due, due_at, source, policy_snapshot, contact_snapshot, created_by)
  values (r.entity_id, r.location_id, v_customer, 'stay', 'pending', q.subtotal, q.discount, q.total, q.deposit_due, v_held, p_source,
          jsonb_build_object('policy_version_id', pol.id, 'version', pol.version, 'params', pol.params, 'summary', pol.summary_md),
          jsonb_build_object('name', p_guest ->> 'name', 'phone', p_guest ->> 'phone', 'email', p_guest ->> 'email'), auth.uid())
  returning id, code into v_order, v_code;

  insert into stay.bookings(entity_id, location_id, order_id, room_id, quote_id, arrival, departure, state, held_until, adults, children_ages, arrival_time, notes, source, policy_snapshot, created_by)
  values (r.entity_id, r.location_id, v_order, r.id, q.id, q.arrival, q.departure, 'held', v_held, q.adults, q.children_ages, p_arrival_time, p_notes, p_source,
          jsonb_build_object('policy_version_id', pol.id, 'params', pol.params), auth.uid())
  returning id into v_booking;

  for l in select * from jsonb_array_elements(q.lines) loop
    insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source, service_date, snapshot)
    values (r.entity_id, v_order,
      case l ->> 'kind' when 'room_night' then 'room_night' when 'extra_guest' then 'room_night' when 'service' then 'service' else 'adjustment' end,
      case when l ->> 'kind' in ('room_night','extra_guest') then r.id else nullif(l ->> 'serviceId', '')::uuid end,
      l ->> 'title', coalesce((l ->> 'qty')::int, 1),
      case when l ? 'unitPrice' then (l ->> 'unitPrice')::bigint else (l ->> 'amount')::bigint end,
      (l ->> 'amount')::bigint,
      case l ->> 'kind' when 'room_night' then 'room' when 'extra_guest' then 'room' when 'service' then coalesce(l ->> 'revenueSource', 'own_service') else null end,
      coalesce((l ->> 'night')::date, nullif(l ->> 'scheduledDate', '')::date), l);
  end loop;

  begin
    insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
    values (r.entity_id, r.location_id, r.id, stay.stay_range(r.location_id, q.arrival, q.departure), 'hold', v_booking);
  exception when exclusion_violation then
    perform core.fail('SOLD_OUT', 'Phòng vừa được đặt trong khoảng ngày này');
  end;

  v_result := jsonb_build_object('bookingId', v_booking, 'orderId', v_order, 'orderCode', v_code, 'heldUntil', v_held,
    'receiptPath', '/dat-phong/' || v_code || '/thanh-toan');
  return commerce.idem_put('stay_hold', p_idempotency::text, v_hash, v_result);
end $$;

-- Public availability + nightly price (no booking details).
create function stay.room_calendar(p_room uuid, p_from date, p_to date)
returns table(date date, available boolean, price text)
language sql stable security definer set search_path = '' as $$
  select n.night,
    r.sellable and not exists (
      select 1 from stay.room_allocations a
      where a.room_id = p_room and a.active
        and a.occupied_range && stay.stay_range(r.location_id, n.night, n.night + 1)
        and not (a.kind = 'hold' and exists (select 1 from stay.bookings b where b.id = a.source_id and b.state = 'held' and b.held_until <= now()))
    ),
    case when r.sellable then n.price::text end
  from stay.rooms r
  cross join lateral stay.price_nights(r.id, greatest(p_from, (now() at time zone 'Asia/Ho_Chi_Minh')::date), least(p_to, p_from + 62)) n
  where r.id = p_room and r.status = 'published'
$$;

-- ---------------------------------------------------------------- RLS & grants
alter table stay.rate_plans enable row level security;
alter table stay.room_allocations enable row level security;
alter table stay.room_blocks enable row level security;
alter table stay.quotes enable row level security;
alter table stay.bookings enable row level security;

grant select on stay.rate_plans to anon, authenticated;
grant select on stay.room_allocations, stay.room_blocks, stay.bookings to authenticated;
grant insert, update on stay.rate_plans to authenticated;
grant all on stay.rate_plans, stay.room_allocations, stay.room_blocks, stay.quotes, stay.bookings to service_role;

create policy rates_read on stay.rate_plans for select using (active or core.has_permission('rate.manage', entity_id, location_id));
create policy rates_insert on stay.rate_plans for insert to authenticated with check (core.has_permission('rate.manage', entity_id, location_id));
create policy rates_update on stay.rate_plans for update to authenticated using (core.has_permission('rate.manage', entity_id, location_id));
create policy allocations_read on stay.room_allocations for select to authenticated using (core.has_permission('room.read', entity_id, location_id));
create policy blocks_read on stay.room_blocks for select to authenticated using (core.has_permission('room.read', entity_id, location_id));
create policy bookings_read on stay.bookings for select to authenticated using (core.has_permission('booking.read', entity_id, location_id));

revoke execute on function stay.price_nights, stay.stay_range, stay.expire_room_holds, stay.block_room, stay.release_block,
  stay.quote_stay, stay.quote_services, stay.create_stay_hold, stay.room_calendar, core.normalize_phone, core.upsert_guest_customer from public;
grant execute on function stay.quote_stay, stay.create_stay_hold, stay.room_calendar, stay.price_nights to anon, authenticated;
grant execute on function stay.block_room, stay.release_block to authenticated;
grant execute on function core.normalize_phone to anon, authenticated;

-- ---------------------------------------------------------------- admin RPCs (permission + audit)
create function stay.save_rate(p_room uuid, p_kind text, p_price bigint, p_dow int default null, p_from date default null, p_to date default null,
  p_extra_adult_fee bigint default 0, p_extra_child_fee bigint default 0, p_label text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r stay.rooms; v_id uuid;
begin
  select * into r from stay.rooms where id = p_room for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('rate.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_price is null or p_price <= 0 then perform core.fail('VALIDATION', 'Giá phải lớn hơn 0'); end if;
  -- New version replaces the active one of the same scope; history stays.
  update stay.rate_plans set active = false
  where room_id = p_room and active and kind = p_kind
    and ((p_kind = 'base') or (p_kind = 'weekday' and dow = p_dow) or (p_kind in ('season','date') and date_range = daterange(p_from, p_to)));
  begin
    insert into stay.rate_plans(entity_id, location_id, room_id, kind, dow, date_range, price, extra_adult_fee, extra_child_fee, label, created_by)
    values (r.entity_id, r.location_id, p_room, p_kind, p_dow, case when p_kind in ('season','date') then daterange(p_from, p_to) end,
            p_price, coalesce(p_extra_adult_fee, 0), coalesce(p_extra_child_fee, 0), p_label, auth.uid())
    returning id into v_id;
  exception
    when exclusion_violation then perform core.fail('VALIDATION', 'Khoảng ngày trùng với giá cùng loại đang áp dụng');
    when check_violation then perform core.fail('VALIDATION', 'Thiếu thứ trong tuần hoặc khoảng ngày cho loại giá này');
  end;
  perform core.audit(r.entity_id, 'rate.save', 'room', p_room::text,
    jsonb_build_object('kind', p_kind, 'dow', p_dow, 'from', p_from, 'to', p_to, 'price', p_price));
  return v_id;
end $$;

create function stay.deactivate_rate(p_rate uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare rp stay.rate_plans;
begin
  select * into rp from stay.rate_plans where id = p_rate for update;
  if not found then return; end if;
  if not core.has_permission('rate.manage', rp.entity_id, rp.location_id) then perform core.fail('FORBIDDEN'); end if;
  if rp.kind = 'base' then perform core.fail('VALIDATION', 'Không tắt giá base; hãy lưu giá base mới'); end if;
  update stay.rate_plans set active = false where id = p_rate;
  perform core.audit(rp.entity_id, 'rate.deactivate', 'room', rp.room_id::text, jsonb_build_object('rate', p_rate), p_reason);
end $$;

create function stay.set_room_sellable(p_room uuid, p_sellable boolean, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare r stay.rooms;
begin
  select * into r from stay.rooms where id = p_room for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('room.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Cần lý do'); end if;
  update stay.rooms set sellable = p_sellable where id = p_room;
  perform core.audit(r.entity_id, 'room.sellable', 'room', p_room::text, jsonb_build_object('sellable', p_sellable), p_reason);
end $$;

create function stay.update_room_energy(p_room uuid, p_card jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare r stay.rooms; v_card uuid;
begin
  select * into r from stay.rooms where id = p_room for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('room.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_card ->> 'title'), '') = '' or coalesce(trim(p_card ->> 'purpose'), '') = '' or coalesce(trim(p_card ->> 'origin'), '') = '' or coalesce(trim(p_card ->> 'usage'), '') = '' then
    perform core.fail('VALIDATION', 'Bảng năng lượng cần tiêu đề, công dụng, nguồn gốc và cách dùng');
  end if;
  insert into core.energy_cards(id, entity_id, title, purpose, origin, usage, frequency, stones, symbols, chakras, ritual_video_url, status)
  values (coalesce(r.energy_card_id, gen_random_uuid()), r.entity_id, p_card ->> 'title', p_card ->> 'purpose', p_card ->> 'origin', p_card ->> 'usage',
    nullif(p_card ->> 'frequency', ''),
    coalesce(array(select jsonb_array_elements_text(p_card -> 'stones')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_card -> 'symbols')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_card -> 'chakras')), '{}'),
    nullif(p_card ->> 'ritualVideoUrl', ''), 'published')
  on conflict (id) do update set title = excluded.title, purpose = excluded.purpose, origin = excluded.origin, usage = excluded.usage,
    frequency = excluded.frequency, stones = excluded.stones, symbols = excluded.symbols, chakras = excluded.chakras,
    ritual_video_url = excluded.ritual_video_url, status = 'published'
  returning id into v_card;
  update stay.rooms set energy_card_id = v_card where id = p_room;
  perform core.audit(r.entity_id, 'room.energy', 'room', p_room::text, p_card);
  return v_card;
end $$;

revoke execute on function stay.save_rate, stay.deactivate_rate, stay.set_room_sellable, stay.update_room_energy from public;
grant execute on function stay.save_rate, stay.deactivate_rate, stay.set_room_sellable, stay.update_room_energy to authenticated;
