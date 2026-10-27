-- T10: front desk LT01-LT05: manual bookings, check-in/out transitions, BM01 shifts + cash movements, BM04 tickets,
-- housekeeping task stub (extended in T11).

-- ---------------------------------------------------------------- housekeeping tasks (created by checkout; T11 adds checklists)
create table stay.housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid,
  area_code text,
  booking_id uuid references stay.bookings(id),
  kind text not null check (kind in ('checkout','stayover','common','rework')),
  state text not null default 'pending' check (state in ('pending','in_progress','awaiting_inspection','approved','rework','cancelled','refused')),
  priority int not null default 2,
  due_at timestamptz,
  assigned_to uuid references auth.users(id),
  template_version int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (room_id is not null or area_code is not null)
);
create trigger touch before update on stay.housekeeping_tasks for each row execute function core.touch();
create index on stay.housekeeping_tasks (location_id, state);
alter table stay.housekeeping_tasks enable row level security;
grant select on stay.housekeeping_tasks to authenticated;
grant all on stay.housekeeping_tasks to service_role;
create policy hk_tasks_read on stay.housekeeping_tasks for select to authenticated using (core.has_permission('housekeeping.read', entity_id, location_id));
alter publication supabase_realtime add table stay.housekeeping_tasks, stay.rooms;

create table stay.room_status_log (
  id bigint generated always as identity primary key,
  room_id uuid not null references stay.rooms(id),
  field text not null,
  from_value text,
  to_value text not null,
  actor uuid,
  reason text,
  created_at timestamptz not null default now()
);
alter table stay.room_status_log enable row level security;
grant select on stay.room_status_log to authenticated;
create policy room_log_read on stay.room_status_log for select to authenticated
  using (exists (select 1 from stay.rooms r where r.id = room_id and core.has_permission('room.read', r.entity_id, r.location_id)));

create function stay.log_room_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cleanliness is distinct from old.cleanliness then
    insert into stay.room_status_log(room_id, field, from_value, to_value, actor) values (new.id, 'cleanliness', old.cleanliness, new.cleanliness, auth.uid());
  end if;
  if new.occupancy is distinct from old.occupancy then
    insert into stay.room_status_log(room_id, field, from_value, to_value, actor) values (new.id, 'occupancy', old.occupancy, new.occupancy, auth.uid());
  end if;
  if new.safety_block is distinct from old.safety_block then
    insert into stay.room_status_log(room_id, field, from_value, to_value, actor) values (new.id, 'safety_block', old.safety_block::text, new.safety_block::text, auth.uid());
  end if;
  return null;
end $$;
create trigger log_room_status after update on stay.rooms for each row execute function stay.log_room_status();

-- ---------------------------------------------------------------- LT01 manual booking
create function stay.create_manual_booking(p_room uuid, p_arrival date, p_departure date, p_adults int, p_children int[], p_guest jsonb,
  p_source text, p_collected_by text, p_notes text, p_idempotency uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r stay.rooms; q jsonb; v_res jsonb;
begin
  select * into r from stay.rooms where id = p_room;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('booking.write', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_source not in ('zalo','phone','walk_in','ota','b2b') then perform core.fail('VALIDATION', 'Nguồn đặt phòng không hợp lệ'); end if;
  if p_collected_by not in ('zsopo','ota') then perform core.fail('VALIDATION', 'Ghi rõ bên thu tiền'); end if;
  v_res := commerce.idem_get('manual_booking', p_idempotency::text, md5(concat_ws('|', p_room, p_arrival, p_departure, p_guest::text)));
  if v_res is not null then return v_res; end if;
  q := stay.quote_stay(p_room, p_arrival, p_departure, p_adults, p_children, '[]'::jsonb);
  -- Guest accepted terms verbally/at the desk; recorded as a staff-sourced consent.
  v_res := stay.create_stay_hold_core((q ->> 'id')::uuid, p_guest, (q ->> 'policyVersion')::uuid, gen_random_uuid(),
    jsonb_build_object('terms', true, 'marketing', false, 'version', 'staff'), null, p_notes, p_source);
  update commerce.orders set collected_by = p_collected_by where id = (v_res ->> 'orderId')::uuid;
  perform core.audit(r.entity_id, 'booking.manual', 'booking', v_res ->> 'bookingId', jsonb_build_object('source', p_source, 'collected_by', p_collected_by));
  return commerce.idem_put('manual_booking', p_idempotency::text, md5(concat_ws('|', p_room, p_arrival, p_departure, p_guest::text)),
    jsonb_build_object('bookingId', v_res ->> 'bookingId', 'orderId', v_res ->> 'orderId', 'orderCode', v_res ->> 'orderCode'));
end $$;

-- ---------------------------------------------------------------- LT02/LT04 transitions
create function stay.transition_booking(p_booking uuid, p_expected_version int, p_action text, p_reason text, p_idempotency uuid, p_opts jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b stay.bookings; r stay.rooms; o commerce.orders; l core.locations; v_res jsonb; v_hash text; v_token text; v_balance bigint; v_late timestamptz; v_task uuid;
begin
  v_hash := md5(concat_ws('|', p_booking, p_expected_version, p_action));
  v_res := commerce.idem_get('booking_transition', p_idempotency::text, v_hash);
  if v_res is not null then return v_res; end if;

  select * into b from stay.bookings where id = p_booking for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('booking.write', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN'); end if;
  if b.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  select * into r from stay.rooms where id = b.room_id for update;
  select * into o from commerce.orders where id = b.order_id for update;
  select * into l from core.locations where id = b.location_id;

  if p_action = 'check_in' then
    if b.state <> 'confirmed' then perform core.fail('INVALID_TRANSITION', 'Chỉ nhận phòng cho đặt phòng đã xác nhận'); end if;
    if b.arrival > (now() at time zone l.timezone)::date then perform core.fail('INVALID_TRANSITION', 'Chưa tới ngày nhận phòng'); end if;
    if r.cleanliness <> 'ready' or r.safety_block or r.occupancy <> 'vacant' then
      perform core.fail('INVALID_TRANSITION', 'Phòng chưa sẵn sàng (chưa nghiệm thu, đang bảo trì hoặc còn khách)');
    end if;
    if not coalesce((p_opts ->> 'identityVerified')::boolean, false) then perform core.fail('VALIDATION', 'Cần đối chiếu giấy tờ tùy thân trước khi giao phòng'); end if;
    update stay.bookings set state = 'checked_in' where id = b.id returning * into b;
    update stay.rooms set occupancy = 'occupied' where id = r.id;
    v_token := stay.issue_stay_token(b.id);
    perform core.enqueue(b.entity_id, 'booking.checked_in', 'booking.checked_in:' || b.id, b.id, '{}'::jsonb);
    perform core.audit(b.entity_id, 'booking.check_in', 'booking', b.id::text, jsonb_build_object('key', p_opts ->> 'keyHandover'));

  elsif p_action = 'check_out' then
    if b.state <> 'checked_in' then perform core.fail('INVALID_TRANSITION'); end if;
    v_balance := o.total - o.paid_amount;
    if v_balance > 0 then
      if not core.has_permission('booking.exception', b.entity_id, b.location_id) or coalesce(trim(p_reason), '') = '' then
        perform core.fail('PAYMENT_REVIEW', format('Còn phải thu %s đ. Thu đủ hoặc cần quản lý duyệt ngoại lệ có lý do.', v_balance));
      end if;
      update commerce.orders set policy_snapshot = policy_snapshot || jsonb_build_object('checkout_exception', jsonb_build_object('due', v_balance, 'reason', p_reason, 'by', auth.uid(), 'at', now()))
      where id = o.id;
    elsif v_balance < 0 then
      perform core.enqueue(b.entity_id, 'payment.overpaid', 'checkout.overpaid:' || b.id, o.id, jsonb_build_object('orderCode', o.code, 'overpaid', -v_balance));
    end if;
    v_late := nullif(p_opts ->> 'lateCheckoutUntil', '')::timestamptz;
    begin
      update stay.room_allocations set occupied_range = tstzrange(lower(occupied_range), greatest(coalesce(v_late, now()), lower(occupied_range) + interval '1 minute'), '[)')
      where source_id = b.id and active and (upper(occupied_range) > now() or v_late is not null);
    exception when exclusion_violation then
      perform core.fail('SOLD_OUT', 'Không gia hạn được: phòng đã có khách kế tiếp');
    end;
    update stay.bookings set state = 'checked_out' where id = b.id returning * into b;
    update stay.rooms set occupancy = 'vacant', cleanliness = 'dirty' where id = r.id;
    perform stay.revoke_stay_tokens(b.id);
    insert into stay.housekeeping_tasks(entity_id, location_id, room_id, booking_id, kind, priority, due_at)
    values (b.entity_id, b.location_id, r.id, b.id, 'checkout', 1, now() + interval '2 hours') returning id into v_task;
    perform core.enqueue(b.entity_id, 'checkout.thanks', 'checkout.thanks:' || b.id, b.id, '{}'::jsonb,
      now() + make_interval(hours => coalesce((b.policy_snapshot -> 'params' ->> 'thanks_hours_after')::int, 24)));
    perform core.audit(b.entity_id, 'booking.check_out', 'booking', b.id::text, jsonb_build_object('balance', v_balance), p_reason);

  elsif p_action = 'cancel' then
    if b.state not in ('held','confirmed','needs_review') then perform core.fail('INVALID_TRANSITION'); end if;
    -- Cancelling a confirmed stay is a manager decision against the booking's policy snapshot.
    if b.state <> 'held' and not core.has_permission('booking.exception', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN', 'Hủy đặt phòng đã xác nhận cần quản lý duyệt'); end if;
    if coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Cần lý do hủy'); end if;
    update stay.bookings set state = 'cancelled' where id = b.id returning * into b;
    update stay.room_allocations set active = false, released_at = now() where source_id = b.id and active;
    update commerce.orders set status = 'cancelled' where id = o.id;
    perform core.audit(b.entity_id, 'booking.cancel', 'booking', b.id::text, jsonb_build_object('policy', b.policy_snapshot -> 'policy_version_id', 'paid', o.paid_amount), p_reason);

  elsif p_action = 'no_show' then
    if b.state <> 'confirmed' or b.arrival >= (now() at time zone l.timezone)::date then perform core.fail('INVALID_TRANSITION', 'Chỉ đánh dấu không đến sau ngày nhận phòng'); end if;
    update stay.bookings set state = 'no_show' where id = b.id returning * into b;
    update stay.room_allocations set active = false, released_at = now() where source_id = b.id and active;
    perform core.audit(b.entity_id, 'booking.no_show', 'booking', b.id::text, '{}'::jsonb, p_reason);
  else
    perform core.fail('VALIDATION', 'Thao tác không hợp lệ');
  end if;

  v_res := jsonb_build_object('state', b.state, 'version', b.version);
  perform commerce.idem_put('booking_transition', p_idempotency::text, v_hash, v_res);
  -- Raw stay token is returned once to the desk (QR/card handover) and never stored in idempotency results.
  return v_res || case when v_token is not null then jsonb_build_object('stayToken', v_token) else '{}'::jsonb end;
end $$;

-- ---------------------------------------------------------------- LT05 / BM01 shifts
create table stay.shifts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  cash_open bigint not null check (cash_open >= 0),
  status text not null default 'open' check (status in ('open','handover_pending','closed')),
  expected_cash bigint,
  cash_counted bigint,
  variance bigint,
  notes text,
  receiver_id uuid references auth.users(id),
  handed_over_at timestamptz,
  receiver_ack_at timestamptz,
  needs_manager_review boolean not null default false,
  template_version int not null default 1,
  snapshot jsonb,
  content_hash text,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);
create unique index shifts_one_open_per_user on stay.shifts (location_id, opened_by) where status = 'open';
create trigger touch before update on stay.shifts for each row execute function core.touch();

-- Signed BM01 is immutable; corrections go to shift_amendments.
create function stay.guard_closed_shift() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'closed' then raise exception 'BM01 đã ký xác nhận, không sửa được; dùng biên bản điều chỉnh' using errcode = '42501'; end if;
  return new;
end $$;
create trigger guard_closed_shift before update or delete on stay.shifts for each row execute function stay.guard_closed_shift();

create table stay.shift_amendments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references stay.shifts(id),
  note text not null,
  amount_delta bigint not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table commerce.cash_movements (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  shift_id uuid not null references stay.shifts(id),
  kind text not null check (kind in ('receipt','expense','remit')),
  amount bigint not null check (amount > 0),
  payment_id uuid unique references commerce.payments(id),
  note text,
  evidence_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Only cash payments enter the drawer count; bank/OTA are reconciled separately.
create function commerce.on_cash_payment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.provider = 'cash' and new.shift_id is not null then
    insert into commerce.cash_movements(entity_id, shift_id, kind, amount, payment_id, created_by)
    values (new.entity_id, new.shift_id, 'receipt', new.amount, new.id, new.recorded_by) on conflict (payment_id) do nothing;
  end if;
  return null;
end $$;
create trigger on_cash_payment after insert on commerce.payments for each row execute function commerce.on_cash_payment();

create function stay.open_shift(p_location uuid, p_cash_open bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_id uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('shift.manage', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  insert into stay.shifts(entity_id, location_id, opened_by, cash_open) values (l.entity_id, l.id, auth.uid(), p_cash_open) returning id into v_id;
  return v_id;
exception when unique_violation then
  perform core.fail('INVALID_TRANSITION', 'Bạn đang có một ca mở');
end $$;

create function stay.add_cash_movement(p_shift uuid, p_kind text, p_amount bigint, p_note text) returns uuid language plpgsql security definer set search_path = '' as $$
declare s stay.shifts; v_id uuid;
begin
  select * into s from stay.shifts where id = p_shift for update;
  if not found or s.status <> 'open' then perform core.fail('INVALID_TRANSITION', 'Ca không còn mở'); end if;
  if s.opened_by <> auth.uid() and not core.has_permission('shift.amend', s.entity_id, s.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_kind not in ('expense','remit') or coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Chỉ ghi chi hoặc nộp quỹ, kèm diễn giải'); end if;
  insert into commerce.cash_movements(entity_id, shift_id, kind, amount, note, created_by) values (s.entity_id, s.id, p_kind, p_amount, p_note, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create function stay.handover_shift(p_shift uuid, p_expected_version int, p_counted_cash bigint, p_receiver uuid, p_notes text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s stay.shifts; v_receipts bigint; v_expenses bigint; v_remit bigint; v_expected bigint; v_snap jsonb; v_self boolean;
begin
  select * into s from stay.shifts where id = p_shift for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if s.opened_by <> auth.uid() then perform core.fail('FORBIDDEN', 'Chỉ người mở ca được bàn giao'); end if;
  if s.status <> 'open' then perform core.fail('INVALID_TRANSITION'); end if;
  if s.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  v_self := p_receiver = auth.uid();
  -- One person holding both roles must split the steps and explain; a manager reviews later.
  if v_self and coalesce(trim(p_notes), '') = '' then perform core.fail('VALIDATION', 'Tự nhận ca cần ghi lý do kiêm nhiệm'); end if;
  if not exists (select 1 from core.user_roles ur where ur.user_id = p_receiver and ur.disabled_at is null and ur.entity_id = s.entity_id and (ur.location_id is null or ur.location_id = s.location_id)) then
    perform core.fail('VALIDATION', 'Người nhận ca không thuộc điểm này');
  end if;
  select coalesce(sum(amount) filter (where kind = 'receipt'), 0), coalesce(sum(amount) filter (where kind = 'expense'), 0), coalesce(sum(amount) filter (where kind = 'remit'), 0)
    into v_receipts, v_expenses, v_remit from commerce.cash_movements where shift_id = s.id;
  v_expected := s.cash_open + v_receipts - v_expenses - v_remit;
  if p_counted_cash <> v_expected and coalesce(trim(p_notes), '') = '' then perform core.fail('VALIDATION', 'Có chênh lệch: cần giải trình'); end if;
  v_snap := jsonb_build_object('template', 'BM01', 'template_version', s.template_version, 'opening', s.cash_open, 'receipts', v_receipts, 'expenses', v_expenses,
    'remitted', v_remit, 'expected', v_expected, 'counted', p_counted_cash, 'variance', p_counted_cash - v_expected, 'notes', p_notes,
    'bank_and_ota_excluded', true,
    'open_tasks', (select count(*) from stay.housekeeping_tasks where location_id = s.location_id and state in ('pending','in_progress','rework')),
    'open_tickets', (select count(*) from stay.tickets where location_id = s.location_id and state in ('open','assigned','in_progress')),
    'handed_over_by', auth.uid(), 'handed_over_at', now(), 'receiver', p_receiver);
  update stay.shifts set status = 'handover_pending', expected_cash = v_expected, cash_counted = p_counted_cash, variance = p_counted_cash - v_expected,
    notes = p_notes, receiver_id = p_receiver, handed_over_at = now(), needs_manager_review = v_self or p_counted_cash <> v_expected, snapshot = v_snap
  where id = s.id returning * into s;
  return jsonb_build_object('expected', v_expected::text, 'variance', (p_counted_cash - v_expected)::text, 'version', s.version);
end $$;

-- Receiver's electronic acknowledgement: account + time + content hash (not a certified digital signature).
create function stay.ack_handover(p_shift uuid, p_expected_version int) returns text language plpgsql security definer set search_path = '' as $$
declare s stay.shifts; v_hash text;
begin
  select * into s from stay.shifts where id = p_shift for update;
  if not found or s.status <> 'handover_pending' then perform core.fail('INVALID_TRANSITION'); end if;
  if s.receiver_id <> auth.uid() then perform core.fail('FORBIDDEN', 'Chỉ người nhận ca xác nhận'); end if;
  if s.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  v_hash := encode(extensions.digest(s.snapshot::text || auth.uid()::text || now()::text, 'sha256'), 'hex');
  update stay.shifts set status = 'closed', receiver_ack_at = now(), content_hash = v_hash,
    snapshot = snapshot || jsonb_build_object('acknowledged_by', auth.uid(), 'acknowledged_at', now())
  where id = s.id;
  perform core.audit(s.entity_id, 'shift.close', 'shift', s.id::text, jsonb_build_object('variance', s.variance, 'hash', v_hash));
  return v_hash;
end $$;

create function stay.amend_shift(p_shift uuid, p_note text, p_amount_delta bigint default 0) returns uuid language plpgsql security definer set search_path = '' as $$
declare s stay.shifts; v_id uuid;
begin
  select * into s from stay.shifts where id = p_shift;
  if not core.has_permission('shift.amend', s.entity_id, s.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Cần nội dung điều chỉnh'); end if;
  insert into stay.shift_amendments(shift_id, note, amount_delta, created_by) values (p_shift, p_note, p_amount_delta, auth.uid()) returning id into v_id;
  perform core.audit(s.entity_id, 'shift.amend', 'shift', p_shift::text, jsonb_build_object('delta', p_amount_delta), p_note);
  return v_id;
end $$;

-- ---------------------------------------------------------------- LT03 / BM04 tickets
create table stay.tickets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid references stay.rooms(id),
  booking_id uuid references stay.bookings(id),
  kind text not null check (kind in ('maintenance','complaint','safety','request','other')),
  priority text not null check (priority in ('low','normal','high','critical')),
  title text not null,
  description text not null default '',
  state text not null default 'open' check (state in ('open','assigned','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id),
  sla_due_at timestamptz not null,
  escalated_at timestamptz,
  resolution text,
  guest_confirmed boolean,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);
create trigger touch before update on stay.tickets for each row execute function core.touch();
create table stay.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references stay.tickets(id),
  from_state text,
  to_state text not null,
  actor uuid,
  note text,
  created_at timestamptz not null default now()
);

create function stay.create_ticket(p_location uuid, p_room uuid, p_booking uuid, p_kind text, p_priority text, p_title text, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_id uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('ticket.manage', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_title), '') = '' then perform core.fail('VALIDATION', 'Cần tiêu đề sự cố'); end if;
  if (p_room is not null and not exists (select 1 from stay.rooms where id = p_room and location_id = l.id))
     or (p_booking is not null and not exists (select 1 from stay.bookings where id = p_booking and location_id = l.id)) then
    perform core.fail('VALIDATION', 'Phòng hoặc đặt phòng không thuộc điểm này');
  end if;
  insert into stay.tickets(entity_id, location_id, room_id, booking_id, kind, priority, title, description, sla_due_at, created_by)
  values (l.entity_id, l.id, p_room, p_booking, p_kind, p_priority, p_title, coalesce(p_description, ''), now() + interval '15 minutes', auth.uid())
  returning id into v_id;
  insert into stay.ticket_events(ticket_id, to_state, actor) values (v_id, 'open', auth.uid());
  -- Danger: alert the on-duty person immediately (spec LT03).
  if p_priority = 'critical' or p_kind = 'safety' then
    update stay.tickets set escalated_at = now() where id = v_id;
    perform core.enqueue(l.entity_id, 'ticket.escalated', 'ticket.escalated:' || v_id, v_id, jsonb_build_object('title', p_title, 'priority', p_priority));
    if p_room is not null and p_kind = 'safety' then update stay.rooms set safety_block = true where id = p_room; end if;
  end if;
  return v_id;
end $$;

create function stay.transition_ticket(p_ticket uuid, p_to text, p_expected_version int, p_note text default null, p_assignee uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t stay.tickets; v_from text;
begin
  select * into t from stay.tickets where id = p_ticket for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('ticket.manage', t.entity_id, t.location_id) then perform core.fail('FORBIDDEN'); end if;
  if t.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  if (t.state, p_to) not in (('open','assigned'), ('open','in_progress'), ('assigned','in_progress'), ('in_progress','resolved'), ('open','resolved'), ('assigned','resolved'), ('resolved','closed'), ('resolved','in_progress')) then
    perform core.fail('INVALID_TRANSITION');
  end if;
  if p_to in ('resolved','closed') and coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Cần ghi kết quả xử lý'); end if;
  v_from := t.state;
  update stay.tickets set state = p_to, assigned_to = coalesce(p_assignee, assigned_to, auth.uid()),
    resolution = case when p_to in ('resolved','closed') then p_note else resolution end
  where id = t.id returning * into t;
  insert into stay.ticket_events(ticket_id, from_state, to_state, actor, note) values (t.id, v_from, p_to, auth.uid(), p_note);
  return jsonb_build_object('state', t.state, 'version', t.version);
end $$;

-- Escalate tickets past the 15-minute SLA once (cron each minute).
create function stay.escalate_overdue_tickets() returns int language plpgsql security definer set search_path = '' as $$
declare t stay.tickets; v_n int := 0;
begin
  for t in select * from stay.tickets where state in ('open','assigned') and sla_due_at < now() and escalated_at is null for update skip locked loop
    update stay.tickets set escalated_at = now() where id = t.id;
    perform core.enqueue(t.entity_id, 'ticket.escalated', 'ticket.escalated:' || t.id, t.id, jsonb_build_object('title', t.title, 'priority', t.priority, 'overdue', true));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
select cron.schedule('escalate-tickets', '* * * * *', 'select stay.escalate_overdue_tickets()');

-- ---------------------------------------------------------------- RLS & grants
alter table stay.shifts enable row level security;
alter table stay.shift_amendments enable row level security;
alter table commerce.cash_movements enable row level security;
alter table stay.tickets enable row level security;
alter table stay.ticket_events enable row level security;
grant select on stay.shifts, stay.shift_amendments, commerce.cash_movements, stay.tickets, stay.ticket_events to authenticated;
grant all on stay.shifts, stay.shift_amendments, commerce.cash_movements, stay.tickets, stay.ticket_events to service_role;
create policy shifts_read on stay.shifts for select to authenticated using (opened_by = auth.uid() or receiver_id = auth.uid() or core.has_permission('shift.amend', entity_id, location_id));
create policy amendments_read on stay.shift_amendments for select to authenticated using (exists (select 1 from stay.shifts s where s.id = shift_id));
create policy cash_read on commerce.cash_movements for select to authenticated using (exists (select 1 from stay.shifts s where s.id = shift_id));
create policy tickets_read on stay.tickets for select to authenticated using (core.has_permission('ticket.manage', entity_id, location_id));
create policy ticket_events_read on stay.ticket_events for select to authenticated using (exists (select 1 from stay.tickets t where t.id = ticket_id));
alter publication supabase_realtime add table stay.tickets;

revoke execute on function stay.log_room_status, stay.create_manual_booking, stay.transition_booking, stay.guard_closed_shift, commerce.on_cash_payment,
  stay.open_shift, stay.add_cash_movement, stay.handover_shift, stay.ack_handover, stay.amend_shift, stay.create_ticket, stay.transition_ticket, stay.escalate_overdue_tickets from public;
grant execute on function stay.create_manual_booking, stay.transition_booking, stay.open_shift, stay.add_cash_movement, stay.handover_shift, stay.ack_handover,
  stay.amend_shift, stay.create_ticket, stay.transition_ticket to authenticated;

-- Colleagues who can receive a shift at this location (names only).
create function stay.shift_receivers(p_location uuid) returns table(user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select distinct p.user_id, p.display_name
  from core.user_roles ur join core.profiles p on p.user_id = ur.user_id and p.disabled_at is null
  join core.locations l on l.id = p_location
  where ur.disabled_at is null and ur.role in ('front_desk','location_manager')
    and ur.entity_id = l.entity_id and (ur.location_id is null or ur.location_id = l.id)
    and core.is_staff_of(l.entity_id, l.id)
$$;
revoke execute on function stay.shift_receivers from public;
grant execute on function stay.shift_receivers to authenticated;
