-- T11: BP01-BP05 checklists (versioned templates), BM02 self-check, BM03 inspection, BP02 refusals,
-- BP03 linen/supply ledger with two-party confirmation, lost & found.

create table stay.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  kind text not null check (kind in ('room_checkout','room_stayover','common_area')),
  version int not null,
  title text not null,
  items jsonb not null, -- [{code, group, label, safety?:bool, photo?:bool, naAllowed?:bool}]
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entity_id, kind, version)
);
create unique index checklist_templates_active on stay.checklist_templates (entity_id, kind) where active;

alter table stay.housekeeping_tasks add column refused_reason text, add column reschedule_at timestamptz,
  add column submitted_at timestamptz, add column submitted_by uuid references auth.users(id), add column inspected_by uuid references auth.users(id),
  add column inspected_at timestamptz, add column inspection_notes text, add column needs_manager_review boolean not null default false;

create table stay.checklist_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references stay.housekeeping_tasks(id),
  item_code text not null,
  result text not null check (result in ('pass','fail','na')),
  note text,
  media_ids uuid[] not null default '{}',
  operation_id uuid not null unique,
  task_version int not null,
  actor uuid not null,
  device text,
  created_at timestamptz not null default now()
);
create index on stay.checklist_results (task_id, item_code, created_at desc);

create table stay.inspections (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references stay.housekeeping_tasks(id),
  form text not null default 'BM03',
  template_version int not null,
  approved boolean not null,
  safety_issue boolean not null default false,
  notes text,
  signed_by uuid not null references auth.users(id),
  signed_at timestamptz not null default now(),
  snapshot jsonb not null,
  content_hash text not null
);

create function stay.task_template(t stay.housekeeping_tasks) returns stay.checklist_templates language sql stable security definer set search_path = '' as $$
  with k as (select case t.kind when 'stayover' then 'room_stayover' when 'common' then 'common_area' else 'room_checkout' end as kind)
  select c.* from stay.checklist_templates c, k
  where c.entity_id = t.entity_id and c.kind = k.kind
    -- Pinned version once work started; otherwise the active template of the same kind.
    and (case when t.template_version is not null then c.version = t.template_version else c.active end)
  order by c.active desc, c.version desc limit 1
$$;

-- Invoker: RLS on checklist_results applies to staff callers; definer RPCs above read through it as owner.
create function stay.latest_results(p_task uuid) returns table(item_code text, result text, note text, actor uuid, task_version int)
language sql stable set search_path = '' as $$
  select distinct on (item_code) item_code, result, note, actor, task_version from stay.checklist_results where task_id = p_task order by item_code, created_at desc
$$;

-- One checklist operation from the (possibly offline) queue. Never throws for sync outcomes: returns a SyncResult.
create function stay.apply_checklist_op(p_op jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t stay.housekeeping_tasks; v_op uuid := (p_op ->> 'operationId')::uuid; v_base int := (p_op ->> 'baseVersion')::int; v_code text := p_op ->> 'itemCode';
  v_result text := p_op ->> 'result'; tpl stay.checklist_templates; v_item jsonb;
begin
  if exists (select 1 from stay.checklist_results where operation_id = v_op) then
    return jsonb_build_object('operationId', v_op, 'state', 'duplicate', 'version', (select version from stay.housekeeping_tasks where id = (p_op ->> 'taskId')::uuid));
  end if;
  select * into t from stay.housekeeping_tasks where id = (p_op ->> 'taskId')::uuid for update;
  if not found or not core.has_permission('housekeeping.work', t.entity_id, t.location_id)
     or (t.assigned_to is not null and t.assigned_to <> auth.uid() and not core.has_permission('inspection.approve', t.entity_id, t.location_id))
     or t.state not in ('pending','in_progress','rework') then
    return jsonb_build_object('operationId', v_op, 'state', 'forbidden', 'version', coalesce(t.version, 0));
  end if;
  tpl := stay.task_template(t);
  select x into v_item from jsonb_array_elements(tpl.items) x where x ->> 'code' = v_code;
  if v_item is null or v_result not in ('pass','fail','na') then perform core.fail('VALIDATION', 'Mục checklist không hợp lệ'); end if;
  if v_result = 'na' and coalesce(trim(p_op ->> 'note'), '') = '' then perform core.fail('VALIDATION', 'Mục không áp dụng cần ghi lý do'); end if;
  -- Someone else changed this item after the version the device saw: keep both, surface a conflict.
  if exists (select 1 from stay.checklist_results r where r.task_id = t.id and r.item_code = v_code and r.task_version > v_base and r.actor <> auth.uid()) then
    return jsonb_build_object('operationId', v_op, 'state', 'conflict', 'version', t.version);
  end if;
  -- Assignment is explicit (manager/lead); several staff may work one room, conflicts are per item.
  update stay.housekeeping_tasks set state = case when state = 'pending' then 'in_progress' else state end
  where id = t.id returning * into t;
  insert into stay.checklist_results(task_id, item_code, result, note, media_ids, operation_id, task_version, actor, device)
  values (t.id, v_code, v_result, nullif(p_op ->> 'note', ''), coalesce(array(select jsonb_array_elements_text(p_op -> 'mediaIds'))::uuid[], '{}'), v_op, t.version, auth.uid(), p_op ->> 'device');
  if t.room_id is not null then update stay.rooms set cleanliness = 'cleaning' where id = t.room_id and cleanliness = 'dirty'; end if;
  return jsonb_build_object('operationId', v_op, 'state', 'applied', 'version', t.version);
end $$;

-- BM02: cleaner's self-check done; room waits for BM03.
create function stay.submit_for_inspection(p_task uuid, p_expected_version int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t stay.housekeeping_tasks; tpl stay.checklist_templates; v_missing int;
begin
  select * into t from stay.housekeeping_tasks where id = p_task for update;
  if not found or not core.has_permission('housekeeping.work', t.entity_id, t.location_id) then perform core.fail('FORBIDDEN'); end if;
  if t.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  if t.state not in ('in_progress','rework') then perform core.fail('INVALID_TRANSITION'); end if;
  tpl := stay.task_template(t);
  select count(*) into v_missing from jsonb_array_elements(tpl.items) x where not exists (select 1 from stay.latest_results(t.id) r where r.item_code = x ->> 'code');
  if v_missing > 0 then perform core.fail('VALIDATION', format('Còn %s mục chưa kiểm', v_missing)); end if;
  update stay.housekeeping_tasks set state = 'awaiting_inspection', submitted_at = now(), submitted_by = auth.uid(), template_version = tpl.version where id = t.id returning * into t;
  if t.room_id is not null then update stay.rooms set cleanliness = 'awaiting_inspection' where id = t.room_id; end if;
  return jsonb_build_object('state', t.state, 'version', t.version);
end $$;

-- BM03 (online only): only approved makes the room ready; a safety failure blocks sale.
create function stay.approve_inspection(p_task uuid, p_expected_version int, p_approved boolean, p_notes text, p_safety_issue boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t stay.housekeeping_tasks; v_fails int; v_snap jsonb; v_cleaners uuid[];
begin
  select * into t from stay.housekeeping_tasks where id = p_task for update;
  if not found or not core.has_permission('inspection.approve', t.entity_id, t.location_id) then perform core.fail('FORBIDDEN'); end if;
  if t.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  if t.state <> 'awaiting_inspection' then perform core.fail('INVALID_TRANSITION'); end if;
  select array_agg(distinct actor) into v_cleaners from stay.checklist_results where task_id = t.id;
  -- Same person cleaning and inspecting must split the steps with a written reason; flagged for manager review.
  if auth.uid() = any(v_cleaners) and coalesce(trim(p_notes), '') = '' then perform core.fail('VALIDATION', 'Tự nghiệm thu phòng mình dọn cần ghi lý do'); end if;
  select count(*) into v_fails from stay.latest_results(t.id) where result = 'fail';
  if p_approved and v_fails > 0 then perform core.fail('VALIDATION', 'BM02 còn mục không đạt, không thể nghiệm thu'); end if;
  v_snap := jsonb_build_object('form', 'BM03', 'template_version', t.template_version, 'results', (select jsonb_agg(to_jsonb(r)) from stay.latest_results(t.id) r),
    'approved', p_approved, 'safety_issue', p_safety_issue, 'notes', p_notes, 'inspector', auth.uid(), 'at', now());
  insert into stay.inspections(task_id, template_version, approved, safety_issue, notes, signed_by, snapshot, content_hash)
  values (t.id, coalesce(t.template_version, 1), p_approved, p_safety_issue, p_notes, auth.uid(), v_snap, encode(extensions.digest(v_snap::text, 'sha256'), 'hex'));
  update stay.housekeeping_tasks set state = case when p_approved then 'approved' else 'rework' end, inspected_by = auth.uid(), inspected_at = now(),
    inspection_notes = p_notes, needs_manager_review = auth.uid() = any(v_cleaners)
  where id = t.id returning * into t;
  if t.room_id is not null then
    update stay.rooms set cleanliness = case when p_approved then 'ready' else 'dirty' end,
      safety_block = safety_block or p_safety_issue
    where id = t.room_id;
    if p_safety_issue then
      perform core.enqueue(t.entity_id, 'ticket.escalated', 'inspection.safety:' || t.id, t.id, jsonb_build_object('title', 'Lỗi an toàn khi nghiệm thu', 'notes', p_notes));
    end if;
  end if;
  return jsonb_build_object('state', t.state, 'version', t.version);
end $$;

-- Manager clears a safety block after repair (audited).
create function stay.clear_safety_block(p_room uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare r stay.rooms;
begin
  select * into r from stay.rooms where id = p_room for update;
  if not core.has_permission('room.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Cần biên bản khắc phục'); end if;
  update stay.rooms set safety_block = false where id = p_room;
  perform core.audit(r.entity_id, 'room.safety_clear', 'room', p_room::text, '{}'::jsonb, p_reason);
end $$;

-- BP02: guest declines or DND -> appointment, never enter.
create function stay.refuse_service(p_task uuid, p_reason text, p_reschedule_at timestamptz) returns void language plpgsql security definer set search_path = '' as $$
declare t stay.housekeeping_tasks;
begin
  select * into t from stay.housekeeping_tasks where id = p_task for update;
  if not found or not core.has_permission('housekeeping.work', t.entity_id, t.location_id) then perform core.fail('FORBIDDEN'); end if;
  if t.kind <> 'stayover' then perform core.fail('INVALID_TRANSITION', 'Chỉ áp dụng cho phòng đang ở'); end if;
  if coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Cần ghi lý do'); end if;
  update stay.housekeeping_tasks set state = 'refused', refused_reason = p_reason, reschedule_at = p_reschedule_at where id = t.id;
  if p_reschedule_at is not null then
    insert into stay.housekeeping_tasks(entity_id, location_id, room_id, booking_id, kind, due_at, notes)
    values (t.entity_id, t.location_id, t.room_id, t.booking_id, 'stayover', p_reschedule_at, 'Hẹn lại: ' || p_reason);
  end if;
end $$;

-- BP04: common area tasks from the active template (N/A with reason for areas the site does not have).
create function stay.create_common_task(p_location uuid, p_area text, p_due timestamptz) returns uuid language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_id uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('sop.manage', l.entity_id, l.id) and not core.has_permission('housekeeping.work', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  insert into stay.housekeeping_tasks(entity_id, location_id, area_code, kind, due_at) values (l.entity_id, l.id, p_area, 'common', p_due) returning id into v_id;
  return v_id;
end $$;

-- BP04 schedule: daily, weekly (ISO weekday 1-7) or monthly (day 1-28, so every month has it). Written only by the RPC below.
create table stay.common_area_schedules (
  location_id uuid not null references core.locations(id),
  area text not null,
  frequency text check (frequency in ('daily','weekly','monthly')),
  day smallint,
  active boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (location_id, area),
  check ((frequency = 'daily' and day is null) or (frequency = 'weekly' and day between 1 and 7) or (frequency = 'monthly' and day between 1 and 28))
);

-- p_frequency null switches the schedule off (the last frequency and day are kept for the list).
create function stay.set_common_schedule(p_location uuid, p_area text, p_frequency text, p_day smallint) returns void language plpgsql security definer set search_path = '' as $$
declare l core.locations;
begin
  select * into l from core.locations where id = p_location;
  if not found or not core.has_permission('sop.manage', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_area), '') = '' then perform core.fail('VALIDATION', 'Cần chọn khu vực'); end if;
  if p_frequency is null then
    update stay.common_area_schedules set active = false, updated_by = auth.uid(), updated_at = now() where location_id = l.id and area = trim(p_area);
    return;
  end if;
  if p_frequency not in ('daily','weekly','monthly')
     or (p_frequency = 'weekly' and coalesce(p_day, 0) not between 1 and 7)
     or (p_frequency = 'monthly' and coalesce(p_day, 0) not between 1 and 28) then
    perform core.fail('VALIDATION', 'Tần suất hoặc ngày không hợp lệ (tuần: thứ 1-7, tháng: ngày 1-28)');
  end if;
  insert into stay.common_area_schedules(location_id, area, frequency, day, active, updated_by)
  values (l.id, trim(p_area), p_frequency, case when p_frequency = 'daily' then null else p_day end, true, auth.uid())
  on conflict (location_id, area) do update
    set frequency = excluded.frequency, day = excluded.day, active = true, updated_by = excluded.updated_by, updated_at = now();
  perform core.audit(l.entity_id, 'common_schedule.set', 'location', l.id::text, jsonb_build_object('area', trim(p_area), 'frequency', p_frequency, 'day', p_day), null);
end $$;

-- Cron (00:05 Vietnam): one task per due schedule per Vietnam day; a re-run creates nothing new.
create function stay.create_due_common_tasks(p_date date default (now() at time zone 'Asia/Ho_Chi_Minh')::date) returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  insert into stay.housekeeping_tasks(entity_id, location_id, area_code, kind, due_at)
  select l.entity_id, s.location_id, s.area, 'common', (p_date + time '10:00') at time zone 'Asia/Ho_Chi_Minh'
  from stay.common_area_schedules s join core.locations l on l.id = s.location_id
  where s.active
    and (s.frequency = 'daily'
      or (s.frequency = 'weekly' and extract(isodow from p_date) = s.day)
      or (s.frequency = 'monthly' and extract(day from p_date) = s.day))
    and not exists (select 1 from stay.housekeeping_tasks t
      where t.location_id = s.location_id and t.kind = 'common' and t.area_code = s.area
        and (t.due_at at time zone 'Asia/Ho_Chi_Minh')::date = p_date);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
select cron.schedule('common-area-tasks', '5 17 * * *', 'select stay.create_due_common_tasks()');

-- ---------------------------------------------------------------- BP03 linen & supplies
create table stay.supply_items (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  code text not null,
  name text not null,
  kind text not null check (kind in ('linen','amenity','chemical','other')),
  min_level int not null default 0,
  unique (location_id, code),
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);
create table stay.supply_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references stay.supply_items(id),
  kind text not null check (kind in ('receive_clean','issue_room','collect_dirty','send_laundry','receive_laundry','discard')),
  qty int not null check (qty > 0),
  room_id uuid references stay.rooms(id),
  actor uuid not null references auth.users(id),
  counterpart uuid references auth.users(id),
  confirmed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create function stay.record_supply_movement(p_item uuid, p_kind text, p_qty int, p_room uuid, p_counterpart uuid, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i stay.supply_items; v_id uuid;
begin
  select * into i from stay.supply_items where id = p_item;
  if not found or not core.has_permission('supply.manage', i.entity_id, i.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_kind = 'discard' and coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Loại bỏ cần lý do (rách, ố, mất)'); end if;
  insert into stay.supply_movements(item_id, kind, qty, room_id, actor, counterpart, note) values (p_item, p_kind, p_qty, p_room, auth.uid(), p_counterpart, nullif(p_note, ''))
  returning id into v_id;
  return v_id;
end $$;

create function stay.confirm_supply_movement(p_movement uuid) returns void language plpgsql security definer set search_path = '' as $$
declare m stay.supply_movements;
begin
  select * into m from stay.supply_movements where id = p_movement for update;
  if not found or m.counterpart is distinct from auth.uid() then perform core.fail('FORBIDDEN', 'Chỉ bên nhận xác nhận'); end if;
  update stay.supply_movements set confirmed_at = now() where id = p_movement;
end $$;

-- clean = received clean + back from laundry - issued; dirty = collected - sent; at laundry = sent - received back.
create function stay.supply_balances(p_location uuid) returns table(item_id uuid, code text, name text, clean int, dirty int, at_laundry int, discarded int, min_level int, below_min boolean, unconfirmed int)
language sql stable security definer set search_path = '' as $$
  select i.id, i.code, i.name, b.clean, b.dirty, b.at_laundry, b.discarded, i.min_level, b.clean < i.min_level, b.unconfirmed
  from stay.supply_items i
  cross join lateral (
    select
      coalesce(sum(qty) filter (where kind in ('receive_clean','receive_laundry')), 0)::int - coalesce(sum(qty) filter (where kind = 'issue_room'), 0)::int as clean,
      coalesce(sum(qty) filter (where kind = 'collect_dirty'), 0)::int - coalesce(sum(qty) filter (where kind in ('send_laundry','discard')), 0)::int as dirty,
      coalesce(sum(qty) filter (where kind = 'send_laundry'), 0)::int - coalesce(sum(qty) filter (where kind = 'receive_laundry'), 0)::int as at_laundry,
      coalesce(sum(qty) filter (where kind = 'discard'), 0)::int as discarded,
      count(*) filter (where counterpart is not null and confirmed_at is null)::int as unconfirmed
    from stay.supply_movements m where m.item_id = i.id) b
  where i.location_id = p_location and core.has_permission('supply.manage', i.entity_id, i.location_id)
$$;

-- ---------------------------------------------------------------- lost & found
create table stay.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid references stay.rooms(id),
  description text not null,
  found_at timestamptz not null default now(),
  found_by uuid not null references auth.users(id),
  witness_id uuid references auth.users(id),
  storage_place text not null,
  seal_code text,
  photo_id uuid,
  status text not null default 'stored' check (status in ('stored','contacted','returned','disposed')),
  verification_note text,
  receipt_no text,
  handled_by uuid references auth.users(id),
  handled_at timestamptz,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);
create trigger touch before update on stay.lost_found_items for each row execute function core.touch();

create function stay.record_lost_item(p_location uuid, p_room uuid, p_description text, p_storage text, p_seal text, p_witness uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_id uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('lostfound.manage', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_description), '') = '' or coalesce(trim(p_storage), '') = '' then perform core.fail('VALIDATION', 'Cần mô tả và nơi cất'); end if;
  insert into stay.lost_found_items(entity_id, location_id, room_id, description, found_by, witness_id, storage_place, seal_code)
  values (l.entity_id, l.id, p_room, p_description, auth.uid(), p_witness, p_storage, nullif(p_seal, '')) returning id into v_id;
  return v_id;
end $$;

-- No automatic disposal deadline (SOP not approved): disposal is an explicit manager decision.
create function stay.transition_lost_item(p_item uuid, p_to text, p_note text, p_receipt text) returns void language plpgsql security definer set search_path = '' as $$
declare i stay.lost_found_items;
begin
  select * into i from stay.lost_found_items where id = p_item for update;
  if not found or not core.has_permission('lostfound.manage', i.entity_id, i.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_to = 'disposed' and not core.has_permission('lostfound.dispose', i.entity_id, i.location_id) then perform core.fail('FORBIDDEN', 'Thanh lý cần quản lý duyệt'); end if;
  if p_to = 'returned' and (coalesce(trim(p_note), '') = '' or coalesce(trim(p_receipt), '') = '') then perform core.fail('VALIDATION', 'Trả đồ cần ghi xác minh chủ sở hữu và số biên nhận'); end if;
  if (i.status, p_to) not in (('stored','contacted'), ('stored','returned'), ('contacted','returned'), ('stored','disposed'), ('contacted','disposed')) then perform core.fail('INVALID_TRANSITION'); end if;
  update stay.lost_found_items set status = p_to, verification_note = coalesce(nullif(p_note, ''), verification_note), receipt_no = coalesce(nullif(p_receipt, ''), receipt_no),
    handled_by = auth.uid(), handled_at = now() where id = i.id;
  perform core.audit(i.entity_id, 'lostfound.' || p_to, 'lost_item', i.id::text, jsonb_build_object('receipt', p_receipt), p_note);
end $$;

-- ---------------------------------------------------------------- RLS & grants
alter table stay.checklist_templates enable row level security;
alter table stay.checklist_results enable row level security;
alter table stay.inspections enable row level security;
alter table stay.supply_items enable row level security;
alter table stay.supply_movements enable row level security;
alter table stay.lost_found_items enable row level security;
alter table stay.common_area_schedules enable row level security;
grant select on stay.checklist_templates, stay.checklist_results, stay.inspections, stay.supply_items, stay.supply_movements, stay.lost_found_items, stay.common_area_schedules to authenticated;
grant insert, update on stay.supply_items to authenticated;
grant all on stay.checklist_templates, stay.checklist_results, stay.inspections, stay.supply_items, stay.supply_movements, stay.lost_found_items, stay.common_area_schedules to service_role;
create policy templates_read on stay.checklist_templates for select to authenticated using (core.is_staff_of(entity_id));
create policy results_read on stay.checklist_results for select to authenticated using (exists (select 1 from stay.housekeeping_tasks t where t.id = task_id));
create policy inspections_read on stay.inspections for select to authenticated using (exists (select 1 from stay.housekeeping_tasks t where t.id = task_id));
create policy supply_items_read on stay.supply_items for select to authenticated using (core.has_permission('supply.manage', entity_id, location_id));
create policy supply_items_write on stay.supply_items for insert to authenticated with check (core.has_permission('sop.manage', entity_id, location_id));
create policy supply_movements_read on stay.supply_movements for select to authenticated using (exists (select 1 from stay.supply_items i where i.id = item_id));
create policy common_schedules_read on stay.common_area_schedules for select to authenticated using (exists (select 1 from core.locations l where l.id = location_id and core.has_permission('housekeeping.read', l.entity_id, l.id)));
create policy lost_read on stay.lost_found_items for select to authenticated using (core.has_permission('lostfound.manage', entity_id, location_id));

revoke execute on function stay.task_template, stay.latest_results, stay.apply_checklist_op, stay.submit_for_inspection, stay.approve_inspection, stay.clear_safety_block,
  stay.refuse_service, stay.create_common_task, stay.set_common_schedule, stay.record_supply_movement, stay.confirm_supply_movement, stay.supply_balances, stay.record_lost_item, stay.transition_lost_item from public;
revoke execute on function stay.create_due_common_tasks from public, anon, authenticated;
grant execute on function stay.apply_checklist_op, stay.submit_for_inspection, stay.approve_inspection, stay.clear_safety_block, stay.refuse_service, stay.create_common_task, stay.set_common_schedule,
  stay.record_supply_movement, stay.confirm_supply_movement, stay.supply_balances, stay.record_lost_item, stay.transition_lost_item, stay.latest_results to authenticated;
