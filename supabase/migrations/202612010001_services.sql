-- T09: stay services (4 PRD groups), prebook pricing in quotes, in-stay requests via stay capability, staff workflow, realtime.

create table stay.services (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  group_key text not null check (group_key in ('food','transport','experience','flex')),
  source_category text, -- keeps the B2B "upsell" semantics when mapped into a PRD group
  slug text not null unique,
  name text not null,
  description text not null default '',
  unit text not null,
  price bigint not null check (price >= 0),
  lead_time_min int not null default 0 check (lead_time_min >= 0),
  serve_from time not null default '00:00',
  serve_to time not null default '23:59',
  audience text,
  photo_id uuid,
  prebook_discount_bp int not null default 0 check (prebook_discount_bp = 0 or prebook_discount_bp between 500 and 1000),
  revenue_source text not null check (revenue_source in ('beverage','own_service','cohost_service')),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);
create trigger touch before update on stay.services for each row execute function core.touch();

create table stay.service_requests (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  booking_id uuid not null references stay.bookings(id),
  service_id uuid not null references stay.services(id),
  order_item_id uuid not null unique references commerce.order_items(id),
  qty int not null check (qty > 0),
  scheduled_at timestamptz not null,
  state text not null default 'requested' check (state in ('requested','accepted','in_progress','completed','cancelled')),
  source text not null check (source in ('prebook','in_stay','staff')),
  notes text,
  idempotency_key uuid unique,
  handled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create trigger touch before update on stay.service_requests for each row execute function core.touch();
create index on stay.service_requests (location_id, state, scheduled_at);

create table stay.service_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references stay.service_requests(id),
  from_state text,
  to_state text not null,
  actor uuid,
  note text,
  created_at timestamptz not null default now()
);

alter table stay.services enable row level security;
alter table stay.service_requests enable row level security;
alter table stay.service_request_events enable row level security;
grant select on stay.services to anon, authenticated;
grant insert, update on stay.services to authenticated;
grant select on stay.service_requests, stay.service_request_events to authenticated;
grant all on stay.services, stay.service_requests, stay.service_request_events to service_role;
create policy services_read on stay.services for select using (active or core.has_permission('service.manage', entity_id, location_id));
create policy services_insert on stay.services for insert to authenticated with check (core.has_permission('rate.manage', entity_id, location_id));
create policy services_update on stay.services for update to authenticated using (core.has_permission('rate.manage', entity_id, location_id));
create policy requests_read on stay.service_requests for select to authenticated using (core.has_permission('service.manage', entity_id, location_id));
create policy request_events_read on stay.service_request_events for select to authenticated
  using (exists (select 1 from stay.service_requests r where r.id = request_id));

-- Realtime for the Ops service board (RLS applies to postgres_changes subscribers).
alter publication supabase_realtime add table stay.service_requests;

-- ---------------------------------------------------------------- pricing (replaces the T05 stub)
create or replace function stay.quote_services(p_room uuid, p_arrival date, p_departure date, p_services jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb; svc stay.services; r stay.rooms; v_out jsonb := '[]'; v_at timestamptz; v_local time; v_amount bigint;
begin
  select * into r from stay.rooms where id = p_room;
  for s in select * from jsonb_array_elements(coalesce(p_services, '[]')) loop
    select * into svc from stay.services where id = (s ->> 'serviceId')::uuid and active and location_id = r.location_id;
    if not found then perform core.fail('VALIDATION', 'Dịch vụ không còn phục vụ'); end if;
    v_at := (s ->> 'scheduledAt')::timestamptz;
    if v_at < now() + make_interval(mins => svc.lead_time_min) then
      perform core.fail('VALIDATION', format('%s cần đặt trước ít nhất %s phút', svc.name, svc.lead_time_min));
    end if;
    if (v_at at time zone 'Asia/Ho_Chi_Minh')::date not between p_arrival and p_departure then
      perform core.fail('VALIDATION', format('%s chỉ đặt trong kỳ ở (%s đến %s)', svc.name, to_char(p_arrival, 'DD/MM'), to_char(p_departure, 'DD/MM')));
    end if;
    v_local := (v_at at time zone 'Asia/Ho_Chi_Minh')::time;
    if v_local < svc.serve_from or v_local > svc.serve_to then
      perform core.fail('VALIDATION', format('%s phục vụ từ %s đến %s', svc.name, to_char(svc.serve_from, 'HH24:MI'), to_char(svc.serve_to, 'HH24:MI')));
    end if;
    if coalesce((s ->> 'qty')::int, 0) < 1 then perform core.fail('VALIDATION', 'Số lượng không hợp lệ'); end if;
    v_amount := svc.price * (s ->> 'qty')::int;
    v_out := v_out || jsonb_build_object('title', svc.name || ' x' || (s ->> 'qty'), 'kind', 'service', 'serviceId', svc.id,
      'qty', (s ->> 'qty')::int, 'unitPrice', svc.price::text, 'amount', v_amount::text,
      'discount', (v_amount * svc.prebook_discount_bp / 10000)::text, 'revenueSource', svc.revenue_source,
      'scheduledAt', v_at, 'scheduledDate', (v_at at time zone 'Asia/Ho_Chi_Minh')::date, 'source', 'prebook');
  end loop;
  return v_out;
end $$;

-- Prebooked service lines become requests when the hold creates its order items.
create function stay.on_service_item() returns trigger language plpgsql security definer set search_path = '' as $$
declare b stay.bookings;
begin
  if new.item_type = 'service' and new.snapshot ->> 'source' = 'prebook' then
    select * into b from stay.bookings where order_id = new.order_id;
    if found then
      insert into stay.service_requests(entity_id, location_id, booking_id, service_id, order_item_id, qty, scheduled_at, source)
      values (new.entity_id, b.location_id, b.id, new.item_id, new.id, new.qty, (new.snapshot ->> 'scheduledAt')::timestamptz, 'prebook');
    end if;
  end if;
  return null;
end $$;
-- Bookings are inserted before their items inside create_stay_hold, so the lookup succeeds.
create trigger on_service_item after insert on commerce.order_items for each row execute function stay.on_service_item();

-- Expired/cancelled bookings cancel open prebook requests; a late reconfirmation reopens the ones the guest still wants
-- (guest/staff cancellations reverse their order item, so only items still active come back).
create function stay.on_booking_closed() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.state in ('expired','cancelled','no_show') and old.state <> new.state then
    update stay.service_requests set state = 'cancelled' where booking_id = new.id and state in ('requested','accepted');
  elsif new.state = 'confirmed' and old.state in ('expired','needs_review') then
    update stay.service_requests r set state = 'requested'
    from commerce.order_items i where i.id = r.order_item_id and i.status = 'active' and r.booking_id = new.id and r.state = 'cancelled';
  end if;
  return null;
end $$;
create trigger on_booking_closed after update of state on stay.bookings for each row execute function stay.on_booking_closed();

-- ---------------------------------------------------------------- stay capability (handed over at check-in)
create function stay.issue_stay_token(p_booking uuid) returns text language plpgsql security definer set search_path = '' as $$
declare b stay.bookings;
begin
  select * into b from stay.bookings where id = p_booking;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if auth.uid() is not null and not core.has_permission('booking.write', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN'); end if;
  if b.state not in ('confirmed','checked_in') then perform core.fail('INVALID_TRANSITION', 'Chỉ cấp cho đặt phòng đã xác nhận hoặc đang ở'); end if;
  -- One active token per stay: rotating revokes the previous one (guest changed / lost card).
  update core.guest_access_tokens set revoked_at = now() where scope = 'stay' and subject_id = p_booking and revoked_at is null;
  return core.issue_guest_token('stay', p_booking, ((b.departure + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'));
end $$;

create function stay.revoke_stay_tokens(p_booking uuid) returns void language sql security definer set search_path = '' as $$
  update core.guest_access_tokens set revoked_at = now() where scope = 'stay' and subject_id = p_booking and revoked_at is null
$$;

-- Shared writer for in-stay/staff requests: one order item per request, idempotent by key.
create function stay.add_service_request(b stay.bookings, p_service uuid, p_qty int, p_scheduled_at timestamptz, p_idempotency uuid, p_source text, p_notes text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare svc stay.services; v_item uuid; v_req uuid; existing stay.service_requests; v_local time;
begin
  select * into existing from stay.service_requests where idempotency_key = p_idempotency;
  if found then return jsonb_build_object('requestId', existing.id, 'orderItemId', existing.order_item_id); end if;
  select * into svc from stay.services where id = p_service and active and location_id = b.location_id;
  if not found then perform core.fail('VALIDATION', 'Dịch vụ không còn phục vụ'); end if;
  if p_qty < 1 or p_qty > 50 then perform core.fail('VALIDATION', 'Số lượng không hợp lệ'); end if;
  if p_scheduled_at < now() + make_interval(mins => svc.lead_time_min) then
    perform core.fail('VALIDATION', format('%s cần đặt trước ít nhất %s phút', svc.name, svc.lead_time_min));
  end if;
  v_local := (p_scheduled_at at time zone 'Asia/Ho_Chi_Minh')::time;
  if v_local < svc.serve_from or v_local > svc.serve_to then perform core.fail('VALIDATION', 'Ngoài khung giờ phục vụ'); end if;
  perform 1 from commerce.orders where id = b.order_id for update;
  insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source, service_date, snapshot, created_by)
  values (b.entity_id, b.order_id, 'service', svc.id, svc.name || ' x' || p_qty, p_qty, svc.price, svc.price * p_qty, svc.revenue_source,
          (p_scheduled_at at time zone 'Asia/Ho_Chi_Minh')::date, jsonb_build_object('source', p_source, 'scheduledAt', p_scheduled_at), auth.uid())
  returning id into v_item;
  update commerce.orders set total = total + svc.price * p_qty, subtotal = subtotal + svc.price * p_qty where id = b.order_id;
  insert into stay.service_requests(entity_id, location_id, booking_id, service_id, order_item_id, qty, scheduled_at, source, notes, idempotency_key)
  values (b.entity_id, b.location_id, b.id, svc.id, v_item, p_qty, p_scheduled_at, p_source, p_notes, p_idempotency)
  returning id into v_req;
  insert into stay.service_request_events(request_id, to_state, actor) values (v_req, 'requested', auth.uid());
  perform core.enqueue(b.entity_id, 'service.requested', 'service.requested:' || v_req, v_req, jsonb_build_object('service', svc.name, 'qty', p_qty));
  return jsonb_build_object('requestId', v_req, 'orderItemId', v_item);
end $$;

create function stay.request_stay_service(p_token text, p_service uuid, p_qty int, p_scheduled_at timestamptz, p_idempotency uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b stay.bookings;
begin
  perform core.rate_limit('service_request', 30);
  select * into b from stay.bookings where id = core.guest_subject(p_token, 'stay') for update;
  if not found or b.state <> 'checked_in' then perform core.fail('FORBIDDEN', 'Phiên dịch vụ của phòng đã hết hiệu lực. Vui lòng liên hệ lễ tân.'); end if;
  return stay.add_service_request(b, p_service, p_qty, p_scheduled_at, p_idempotency, 'in_stay', p_notes);
end $$;

create function stay.staff_request_service(p_booking uuid, p_service uuid, p_qty int, p_scheduled_at timestamptz, p_idempotency uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b stay.bookings;
begin
  select * into b from stay.bookings where id = p_booking for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('service.manage', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN'); end if;
  if b.state not in ('confirmed','checked_in') then perform core.fail('INVALID_TRANSITION'); end if;
  return stay.add_service_request(b, p_service, p_qty, p_scheduled_at, p_idempotency, 'staff', p_notes);
end $$;

-- Charged lines are never deleted: cancellation adds a reversing adjustment line.
create function stay.reverse_service_item(p_item uuid) returns void language plpgsql security definer set search_path = '' as $$
declare i commerce.order_items; v_discount bigint;
begin
  select * into i from commerce.order_items where id = p_item for update;
  if i.status = 'cancelled' then return; end if;
  update commerce.order_items set status = 'cancelled' where id = p_item;
  insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source, service_date, reversal_of, snapshot, created_by)
  values (i.entity_id, i.order_id, 'adjustment', i.item_id, 'Hủy: ' || i.title, -i.qty, i.unit_price, -i.amount, null, i.service_date, i.id, jsonb_build_object('reason', 'service cancelled'), auth.uid());
  -- A prebooked line carried a discount on a separate order line: give that discount back too, so the order drops by what was charged.
  v_discount := coalesce((i.snapshot ->> 'discount')::bigint, 0);
  if v_discount > 0 then
    insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, reversal_of, snapshot, created_by)
    values (i.entity_id, i.order_id, 'adjustment', i.item_id, 'Hủy ưu đãi: ' || i.title, 1, v_discount, v_discount, i.id, jsonb_build_object('reason', 'service cancelled'), auth.uid());
  end if;
  update commerce.orders set total = greatest(total - i.amount + v_discount, 0), subtotal = greatest(subtotal - i.amount, 0), discount = greatest(discount - v_discount, 0) where id = i.order_id;
end $$;

create function stay.cancel_my_service(p_token text, p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r stay.service_requests;
begin
  select * into r from stay.service_requests where id = p_request and booking_id = core.guest_subject(p_token, 'stay') for update;
  if not found then perform core.fail('FORBIDDEN'); end if;
  if r.state <> 'requested' then perform core.fail('INVALID_TRANSITION', 'Lễ tân đã nhận yêu cầu, vui lòng liên hệ quầy để hủy'); end if;
  update stay.service_requests set state = 'cancelled' where id = r.id;
  insert into stay.service_request_events(request_id, from_state, to_state, note) values (r.id, r.state, 'cancelled', 'Khách hủy');
  perform stay.reverse_service_item(r.order_item_id);
end $$;

create function stay.transition_service_request(p_request uuid, p_to text, p_expected_version int, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r stay.service_requests; v_ok boolean; v_from text;
begin
  select * into r from stay.service_requests where id = p_request for update;
  v_from := r.state;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('service.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if r.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  v_ok := (r.state, p_to) in (('requested','accepted'), ('accepted','in_progress'), ('in_progress','completed'),
    ('requested','cancelled'), ('accepted','cancelled'), ('in_progress','cancelled'));
  if not v_ok then perform core.fail('INVALID_TRANSITION'); end if;
  if p_to = 'cancelled' and coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Cần lý do hủy'); end if;
  update stay.service_requests set state = p_to, handled_by = auth.uid() where id = r.id returning * into r;
  insert into stay.service_request_events(request_id, from_state, to_state, actor, note) values (r.id, v_from, p_to, auth.uid(), p_note);
  if p_to = 'completed' then
    update commerce.order_items set status = 'completed', completed_at = now() where id = r.order_item_id;
  elsif p_to = 'cancelled' then
    perform stay.reverse_service_item(r.order_item_id);
    perform core.audit(r.entity_id, 'service.cancel', 'service_request', r.id::text, '{}'::jsonb, p_note);
  end if;
  return jsonb_build_object('state', r.state, 'version', r.version);
end $$;

-- Guest's own in-stay view (no other guests' data).
create function stay.my_stay_services(p_token text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'booking', jsonb_build_object('roomName', rm.name, 'departure', b.departure),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', s.name, 'qty', r.qty, 'state', r.state, 'scheduledAt', r.scheduled_at, 'amount', i.amount::text) order by r.scheduled_at)
      from stay.service_requests r join stay.services s on s.id = r.service_id join commerce.order_items i on i.id = r.order_item_id where r.booking_id = b.id), '[]'::jsonb))
  from stay.bookings b join stay.rooms rm on rm.id = b.room_id
  where b.id = core.guest_subject(p_token, 'stay') and b.state = 'checked_in'
$$;

revoke execute on function stay.on_service_item, stay.on_booking_closed, stay.issue_stay_token, stay.revoke_stay_tokens, stay.add_service_request,
  stay.request_stay_service, stay.staff_request_service, stay.reverse_service_item, stay.cancel_my_service, stay.transition_service_request, stay.my_stay_services from public;
grant execute on function stay.request_stay_service, stay.cancel_my_service, stay.my_stay_services to anon, authenticated;
grant execute on function stay.issue_stay_token, stay.staff_request_service, stay.transition_service_request to authenticated;
grant execute on function stay.revoke_stay_tokens to service_role;
