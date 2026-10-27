-- T17: five-source operating metrics (recognized revenue vs cash vs deposit liability), manual sales outside the web,
-- versioned settings with audit.

-- Revenue recognition (operational, pending Finance sign-off):
--   room: per night served (service_date < today) of checked-in/out stays; services/products/manual: when completed.
create function commerce.get_location_metrics(p_entity uuid, p_location uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_rev jsonb; v_cash bigint; v_liab bigint; v_occ int; v_sell int; v_room bigint; v_nights int; v_channels jsonb; v_shop jsonb;
begin
  if not core.has_permission('metrics.read', p_entity, p_location) then perform core.fail('FORBIDDEN'); end if;
  if p_to < p_from or p_to - p_from > 366 then perform core.fail('VALIDATION', 'Khoảng ngày không hợp lệ (tối đa 1 năm)'); end if;

  with recognized as (
    select i.revenue_source, i.amount, i.order_id from commerce.order_items i
    join commerce.orders o on o.id = i.order_id and o.entity_id = p_entity and (o.location_id = p_location or (o.location_id is null and o.kind = 'shop' and p_location is null))
    left join stay.bookings b on b.order_id = o.id
    where i.status <> 'cancelled' and i.revenue_source is not null and (
      (i.revenue_source = 'room' and i.service_date between p_from and p_to and i.service_date < v_today and b.state in ('checked_in','checked_out'))
      or (i.revenue_source <> 'room' and i.status = 'completed' and (i.completed_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to))
  )
  select jsonb_build_object(
    'room', coalesce(sum(amount) filter (where revenue_source = 'room'), 0)::text,
    'beverage', coalesce(sum(amount) filter (where revenue_source = 'beverage'), 0)::text,
    'own_service', coalesce(sum(amount) filter (where revenue_source = 'own_service'), 0)::text,
    'product', coalesce(sum(amount) filter (where revenue_source = 'product'), 0)::text,
    'cohost_service', coalesce(sum(amount) filter (where revenue_source = 'cohost_service'), 0)::text),
    coalesce(sum(amount) filter (where revenue_source = 'room'), 0)
  into v_rev, v_room from recognized;

  select coalesce(sum(distinct_amount), 0) into v_cash from (
    select distinct p.id, p.amount as distinct_amount from commerce.payments p
    join commerce.payment_allocations pa on pa.payment_id = p.id join commerce.orders o on o.id = pa.order_id
    where o.entity_id = p_entity and o.location_id = p_location and (p.received_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to) x;

  -- Liability at p_to: money allocated to orders minus what has been recognized for those orders (never negative), plus customer credit.
  select coalesce(sum(greatest(paid - recog, 0)), 0) into v_liab from (
    select o.id,
      (select coalesce(sum(pa.amount), 0) from commerce.payment_allocations pa where pa.order_id = o.id and (pa.created_at at time zone 'Asia/Ho_Chi_Minh')::date <= p_to) as paid,
      (select coalesce(sum(i.amount), 0) from commerce.order_items i left join stay.bookings b on b.order_id = o.id
        where i.order_id = o.id and i.status <> 'cancelled' and i.revenue_source is not null and (
          (i.revenue_source = 'room' and i.service_date <= p_to and i.service_date < v_today and b.state in ('checked_in','checked_out'))
          or (i.revenue_source <> 'room' and i.status = 'completed' and (i.completed_at at time zone 'Asia/Ho_Chi_Minh')::date <= p_to))) as recog
    from commerce.orders o where o.entity_id = p_entity and o.location_id = p_location) t;
  v_liab := v_liab + coalesce((select -sum(e.amount) from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id
    where v.entity_id = p_entity and v.location_id = p_location and e.account = 'customer_credit' and e.recognition_date <= p_to), 0);

  -- Occupancy: occupied nights (direct bookings + OTA) / sellable nights (sellable rooms minus maintenance-closed nights).
  with nights as (select d::date n from generate_series(p_from, p_to, interval '1 day') d),
  rooms as (select id from stay.rooms where location_id = p_location and sellable and status = 'published'),
  grid as (
    select r.id, n.n, (select a.kind from stay.room_allocations a left join stay.bookings b on b.id = a.source_id
        where a.room_id = r.id and a.active and a.occupied_range && stay.stay_range(p_location, n.n, n.n + 1)
          and (a.kind <> 'booking' or b.state in ('confirmed','checked_in','checked_out')) limit 1) as kind
    from rooms r cross join nights n)
  select count(*) filter (where kind in ('booking','ota')), count(*) filter (where kind is distinct from 'maintenance') into v_occ, v_sell from grid;

  select count(*) into v_nights from commerce.order_items i join commerce.orders o on o.id = i.order_id join stay.bookings b on b.order_id = o.id
  where o.entity_id = p_entity and o.location_id = p_location and i.item_type = 'room_night' and i.revenue_source = 'room' and i.status <> 'cancelled'
    and i.service_date between p_from and p_to and i.service_date < v_today and b.state in ('checked_in','checked_out')
    and i.title not like 'Phụ thu%';

  select coalesce(jsonb_object_agg(source, n), '{}') into v_channels from (
    select b.source, count(*) n from stay.bookings b where b.entity_id = p_entity and b.location_id = p_location
      and b.state not in ('cancelled','expired') and (b.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to group by b.source) c;

  select jsonb_build_object('count', count(*), 'total', coalesce(sum(total), 0)::text) into v_shop from commerce.orders
  where entity_id = p_entity and kind = 'shop' and status not in ('cancelled','expired') and (created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to;

  return jsonb_build_object('from', p_from, 'to', p_to, 'timezone', 'Asia/Ho_Chi_Minh',
    'recognizedRevenueBySource', v_rev, 'cashCollected', v_cash::text, 'depositsLiability', v_liab::text,
    'occupancy', jsonb_build_object('occupied', v_occ, 'sellable', v_sell, 'pct', case when v_sell > 0 then round(v_occ * 100.0 / v_sell, 1) end),
    'adr', case when v_nights > 0 then (v_room / v_nights)::text end, 'bookingsByChannel', v_channels, 'shopOrders', v_shop);
end $$;

-- Revenue taken outside the web (cafe counter, co-hosted activities): an order + completed item + recorded payment, with evidence.
create function commerce.record_manual_sale(p_location uuid, p_revenue_source text, p_title text, p_amount bigint, p_provider text, p_evidence_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_order uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('payment.record', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  if p_revenue_source not in ('beverage','own_service','product','cohost_service') or p_amount <= 0 or coalesce(trim(p_evidence_note), '') = '' then
    perform core.fail('VALIDATION', 'Cần nguồn doanh thu, số tiền và chứng từ');
  end if;
  insert into commerce.orders(entity_id, location_id, kind, status, subtotal, total, source, created_by) values (l.entity_id, l.id, 'manual', 'completed', p_amount, p_amount, 'walk_in', auth.uid())
  returning id into v_order;
  insert into commerce.order_items(entity_id, order_id, item_type, title, qty, unit_price, amount, revenue_source, status, completed_at, created_by)
  values (l.entity_id, v_order, 'manual', p_title, 1, p_amount, p_amount, p_revenue_source, 'completed', now(), auth.uid());
  perform commerce.record_payment_atomic(v_order, p_provider, 'MANUAL-' || v_order, p_amount, now(), p_evidence_note, null, null, gen_random_uuid());
  return v_order;
end $$;

-- Settings: every change audited with before/after (redacted); version bumps via touch trigger.
create function ops_config.set_setting(p_key text, p_value jsonb, p_public boolean) returns void language plpgsql security definer set search_path = '' as $$
declare old ops_config.runtime_settings;
begin
  select * into old from ops_config.runtime_settings where key = p_key for update;
  if not core.has_permission('config.manage', coalesce(old.entity_id, (select id from core.entities where code = 'ZS-SPACE')), null) then perform core.fail('FORBIDDEN'); end if;
  insert into ops_config.runtime_settings(key, entity_id, value, is_public, updated_by) values (p_key, old.entity_id, p_value, p_public, auth.uid())
  on conflict (key) do update set value = excluded.value, is_public = excluded.is_public, updated_by = auth.uid();
  perform core.audit(old.entity_id, 'config.set', 'setting', p_key, jsonb_build_object('before', old.value, 'after', p_value));
end $$;

revoke execute on function commerce.get_location_metrics, commerce.record_manual_sale, ops_config.set_setting from public;
grant execute on function commerce.get_location_metrics, commerce.record_manual_sale, ops_config.set_setting to authenticated;
