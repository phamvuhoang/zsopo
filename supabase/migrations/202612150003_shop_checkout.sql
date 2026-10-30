-- T15: shipping rules by region, carts, server-priced checkout with atomic stock reservation, fulfillment lifecycle
-- (incl. 24h ritual gate), bank-transfer expiry, shipments.

create table shop.regions (
  code text primary key,
  name text not null,
  sort int not null default 0,
  active boolean not null default true
);

create table shop.shipping_rules (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  region_code text not null, -- 'default' or shop.regions.code
  fee bigint not null check (fee >= 0),
  free_threshold bigint check (free_threshold is null or free_threshold > 0),
  active boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create unique index shipping_rules_active on shop.shipping_rules (entity_id, region_code) where active;

alter table commerce.orders
  add column fulfillment_status text check (fulfillment_status in ('new','confirmed','packing','ritual_hold','ready_to_ship','shipped','completed','cancelled','returned')),
  add column payment_method text check (payment_method in ('cod','bank','vietqr_manual','cash')),
  add column ritual_required boolean not null default false,
  add column ritual_started_at timestamptz,
  add column shipping_fee bigint not null default 0,
  add column cod_overdue_at timestamptz;

create table shop.shipments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  order_id uuid not null unique,
  address jsonb not null,
  carrier text,
  tracking text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id)
);

create table shop.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table shop.cart_items (
  cart_id uuid not null references shop.carts(id) on delete cascade,
  variant_id uuid not null references shop.product_variants(id),
  qty int not null check (qty between 1 and 50),
  primary key (cart_id, variant_id)
);

create table shop.fulfillment_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references commerce.orders(id),
  from_status text,
  to_status text not null,
  actor uuid,
  note text,
  created_at timestamptz not null default now()
);

create function shop.rule_for(p_entity uuid, p_region text) returns shop.shipping_rules language sql stable security definer set search_path = '' as $$
  select * from shop.shipping_rules where entity_id = p_entity and active and region_code in (coalesce(p_region, 'default'), 'default')
  order by (region_code = 'default') limit 1
$$;

-- Price lines from the DB (client prices ignored), cap by availability; shipping on goods value.
create function shop.price_cart(p_lines jsonb, p_region text default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l jsonb; v record; v_out jsonb := '[]'; v_sub bigint := 0; v_avail int; v_qty int; v_entity uuid; rule shop.shipping_rules; v_ship bigint := 0;
begin
  if jsonb_array_length(coalesce(p_lines, '[]')) > 20 then perform core.fail('VALIDATION', 'Tối đa 20 dòng sản phẩm'); end if;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    select pv.id, pv.price, pv.entity_id, pr.name || ' - ' || pv.name as name into v
    from shop.product_variants pv join shop.products pr on pr.id = pv.product_id and pr.status = 'published'
    where pv.id = (l ->> 'variantId')::uuid and pv.active;
    if not found then continue; end if;
    v_entity := v.entity_id;
    select coalesce(sum(on_hand - reserved), 0) into v_avail from shop.inventory where variant_id = v.id;
    v_qty := least(greatest(coalesce((l ->> 'qty')::int, 1), 1), greatest(v_avail, 0), 50);
    v_out := v_out || jsonb_build_object('variantId', v.id, 'qty', v_qty, 'maxQty', greatest(v_avail, 0), 'name', v.name,
      'price', v.price::text, 'amount', (v.price * v_qty)::text, 'inStock', v_avail > 0);
    v_sub := v_sub + v.price * v_qty;
  end loop;
  if v_entity is not null and v_sub > 0 then
    rule := shop.rule_for(v_entity, p_region);
    v_ship := case when rule.free_threshold is not null and v_sub >= rule.free_threshold then 0 else coalesce(rule.fee, 0) end;
  end if;
  return jsonb_build_object('lines', v_out, 'subtotal', v_sub::text, 'shipping', v_ship::text, 'total', (v_sub + v_ship)::text);
end $$;

create function shop.create_shop_order(p_lines jsonb, p_address jsonb, p_method text, p_email text, p_idempotency uuid, p_consents jsonb, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hash text := md5(concat_ws('|', p_lines::text, p_address::text, p_method, p_email)); v_res jsonb; l jsonb; v record; v_entity uuid;
  v_sub bigint := 0; v_ship bigint; rule shop.shipping_rules; v_order uuid; v_code text; v_customer uuid; v_ritual boolean := false; pol ops_config.policy_versions;
begin
  v_res := commerce.idem_get('shop_order', p_idempotency::text, v_hash);
  if v_res is not null then
    return v_res || jsonb_build_object('guestToken', core.issue_guest_token('order', (v_res ->> 'orderId')::uuid, now() + interval '90 days'));
  end if;
  perform core.rate_limit('shop_order', 10);
  if not content.policies_published() then perform core.fail('SOLD_OUT', 'Đặt hàng trực tuyến chưa mở'); end if;
  if not coalesce((p_consents ->> 'terms')::boolean, false) then perform core.fail('VALIDATION', 'Cần đồng ý điều khoản và chính sách giao hàng'); end if;
  if p_method not in ('cod','bank') then perform core.fail('VALIDATION', 'Chỉ nhận COD hoặc chuyển khoản'); end if;
  if length(trim(coalesce(p_address ->> 'name', ''))) < 2 or core.normalize_phone(p_address ->> 'phone') !~ '^0\d{9,10}$' or length(trim(coalesce(p_address ->> 'line1', ''))) < 5 then
    perform core.fail('VALIDATION', 'Cần họ tên, số điện thoại và địa chỉ giao hàng');
  end if;
  if coalesce(p_address ->> 'regionCode', 'default') <> 'default' and not exists (select 1 from shop.regions where code = p_address ->> 'regionCode' and active) then
    perform core.fail('VALIDATION', 'Khu vực giao hàng không hợp lệ');
  end if;
  if jsonb_array_length(coalesce(p_lines, '[]')) = 0 or jsonb_array_length(p_lines) > 20 then perform core.fail('VALIDATION', 'Giỏ hàng trống hoặc quá dài'); end if;
  -- One line (and so one reservation, one warehouse) per variant: duplicate lines are merged.
  p_lines := (select jsonb_agg(jsonb_build_object('variantId', k, 'qty', q)) from (
    select e ->> 'variantId' k, sum(coalesce((e ->> 'qty')::int, 0)) q from jsonb_array_elements(p_lines) e group by 1) x);

  -- Server-side pricing.
  for l in select * from jsonb_array_elements(p_lines) loop
    select pv.id, pv.price, pv.entity_id, pr.name || ' - ' || pv.name as name, pr.requires_ritual into v
    from shop.product_variants pv join shop.products pr on pr.id = pv.product_id and pr.status = 'published'
    where pv.id = (l ->> 'variantId')::uuid and pv.active;
    if not found then perform core.fail('SOLD_OUT', 'Một sản phẩm không còn bán'); end if;
    if coalesce((l ->> 'qty')::int, 0) not between 1 and 50 then perform core.fail('VALIDATION', 'Số lượng không hợp lệ'); end if;
    v_entity := v.entity_id;
    v_sub := v_sub + v.price * (l ->> 'qty')::int;
    v_ritual := v_ritual or v.requires_ritual;
  end loop;
  rule := shop.rule_for(v_entity, p_address ->> 'regionCode');
  v_ship := case when rule.free_threshold is not null and v_sub >= rule.free_threshold then 0 else coalesce(rule.fee, 0) end;
  pol := ops_config.current_policy(null, 'shop');

  v_customer := core.upsert_guest_customer(v_entity, jsonb_build_object('name', p_address ->> 'name', 'phone', p_address ->> 'phone', 'email', p_email), 'web', p_consents);
  insert into commerce.orders(entity_id, customer_id, kind, status, subtotal, total, shipping_fee, source, payment_method, fulfillment_status, ritual_required,
    due_at, policy_snapshot, contact_snapshot)
  values (v_entity, v_customer, 'shop', 'pending', v_sub, v_sub + v_ship, v_ship, 'web', p_method, 'new',
    v_ritual and coalesce((pol.params ->> 'ritual_24h')::boolean, true),
    case when p_method = 'bank' then now() + make_interval(hours => coalesce((pol.params ->> 'bank_due_hours')::int, 24)) end,
    jsonb_build_object('policy_version_id', pol.id, 'params', pol.params, 'shipping_rule', to_jsonb(rule)),
    jsonb_build_object('name', p_address ->> 'name', 'phone', p_address ->> 'phone', 'email', p_email))
  returning id, code into v_order, v_code;

  for l in select * from jsonb_array_elements(p_lines) loop
    select pv.id, pv.price, pr.name || ' - ' || pv.name as name into v
    from shop.product_variants pv join shop.products pr on pr.id = pv.product_id where pv.id = (l ->> 'variantId')::uuid;
    insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source)
    values (v_entity, v_order, 'product', v.id, v.name, (l ->> 'qty')::int, v.price, v.price * (l ->> 'qty')::int, 'product');
    -- Reserve now (COD too). Any shortage aborts the whole order: nothing half-reserved.
    perform shop.reserve_stock(v_order, v.id, (l ->> 'qty')::int, case when p_method = 'bank' then now() + interval '24 hours' end);
  end loop;
  if v_ship > 0 then
    insert into commerce.order_items(entity_id, order_id, item_type, title, qty, unit_price, amount) values (v_entity, v_order, 'shipping', 'Phí giao hàng', 1, v_ship, v_ship);
  end if;
  insert into shop.shipments(entity_id, order_id, address) values (v_entity, v_order, p_address);
  insert into shop.fulfillment_events(order_id, to_status, note) values (v_order, 'new', p_notes);
  perform core.enqueue(v_entity, 'shop.order_placed', 'shop.order_placed:' || v_order, v_order, jsonb_build_object('orderCode', v_code, 'method', p_method));

  v_res := jsonb_build_object('orderId', v_order, 'orderCode', v_code, 'total', (v_sub + v_ship)::text, 'receiptPath', '/don-hang/' || v_code);
  perform commerce.idem_put('shop_order', p_idempotency::text, v_hash, v_res);
  return v_res || jsonb_build_object('guestToken', core.issue_guest_token('order', v_order, now() + interval '90 days'));
end $$;

create function shop.transition_fulfillment(p_order uuid, p_to text, p_expected_version int, p_note text default null, p_tracking text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; v_from text; r record; v_ok boolean; v_hours int; v_back bigint := 0;
begin
  select * into o from commerce.orders where id = p_order and kind = 'shop' for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('orders.manage', o.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if o.version <> p_expected_version then perform core.fail('VERSION_CONFLICT'); end if;
  v_from := o.fulfillment_status;
  v_ok := (v_from, p_to) in (('new','confirmed'),('new','cancelled'),('confirmed','packing'),('confirmed','cancelled'),('packing','ritual_hold'),('packing','ready_to_ship'),
    ('packing','cancelled'),('ritual_hold','ready_to_ship'),('ritual_hold','cancelled'),('ready_to_ship','shipped'),('ready_to_ship','cancelled'),
    ('shipped','completed'),('shipped','returned'),('completed','returned'));
  if not v_ok then perform core.fail('INVALID_TRANSITION'); end if;
  if p_to = 'ready_to_ship' and o.ritual_required then
    v_hours := coalesce((o.policy_snapshot -> 'params' ->> 'ritual_hours')::int, 24);
    if o.ritual_started_at is null or now() < o.ritual_started_at + make_interval(hours => v_hours) then
      perform core.fail('INVALID_TRANSITION', format('Sản phẩm cần nghi lễ đủ %s giờ trước khi giao', v_hours));
    end if;
  end if;
  -- An unpaid bank-transfer order is not held or shipped: it stays pending (so the expiry cron releases its stock) until the money is in.
  if p_to in ('ready_to_ship','shipped') and o.payment_method = 'bank' and o.payment_status not in ('paid','overpaid') then
    perform core.fail('INVALID_TRANSITION', 'Đơn chuyển khoản chưa nhận đủ tiền');
  end if;
  if p_to = 'shipped' and coalesce(trim(p_tracking), '') = '' then perform core.fail('VALIDATION', 'Cần mã vận đơn hoặc ghi chú giao tay'); end if;

  -- Returned goods stop being revenue and the order shrinks by their price (shipping stays). A completed line keeps its row, so the period it
  -- was recognised in does not change, and gets a negative product line dated now. A line not yet completed is cancelled with a non-revenue
  -- reversal, as stay.reverse_service_item does.
  if p_to = 'returned' then
    with rev as (
      insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source, status, completed_at, reversal_of, snapshot, created_by)
      select entity_id, order_id, 'adjustment', item_id, 'Trả hàng: ' || title, -qty, unit_price, -amount,
        case when status = 'completed' then 'product' end, case when status = 'completed' then 'completed' else 'active' end,
        case when status = 'completed' then now() end, id, jsonb_build_object('reason', 'order returned'), auth.uid()
      from commerce.order_items where order_id = o.id and item_type = 'product' and status in ('active','completed')
      returning amount)
    select coalesce(-sum(amount), 0) into v_back from rev;
    update commerce.order_items set status = 'cancelled' where order_id = o.id and item_type = 'product' and status = 'active';
  end if;

  update commerce.orders set fulfillment_status = p_to, total = total - v_back, subtotal = subtotal - v_back,
    payment_status = case when p_to = 'returned' and paid_amount > total - v_back then 'overpaid' else payment_status end,
    ritual_started_at = case when p_to = 'ritual_hold' then now() else ritual_started_at end,
    status = case when p_to = 'cancelled' then 'cancelled' when p_to = 'completed' and payment_status in ('paid','overpaid') then 'completed' when p_to = 'confirmed' and status = 'pending' and (payment_method = 'cod' or payment_status in ('paid','overpaid')) then 'confirmed' else status end
  where id = o.id returning * into o;

  if p_to = 'cancelled' then
    for r in select id from shop.stock_reservations where order_id = o.id and state = 'active' loop perform shop.release_reservation(r.id); end loop;
  elsif p_to = 'shipped' then
    for r in select id from shop.stock_reservations where order_id = o.id and state = 'active' loop perform shop.ship_reservation(r.id); end loop;
    update shop.shipments set tracking = p_tracking, shipped_at = now() where order_id = o.id;
  elsif p_to = 'completed' then
    update shop.shipments set delivered_at = now() where order_id = o.id;
    update commerce.order_items set status = 'completed', completed_at = now() where order_id = o.id and item_type = 'product' and status = 'active';
  end if;
  insert into shop.fulfillment_events(order_id, from_status, to_status, actor, note) values (o.id, v_from, p_to, auth.uid(), p_note);
  perform core.audit(o.entity_id, 'fulfillment.' || p_to, 'order', o.id::text, jsonb_build_object('tracking', p_tracking), p_note);
  return jsonb_build_object('fulfillment', o.fulfillment_status, 'version', o.version);
end $$;

-- Returned goods re-enter stock only after inspection (once per order item).
create function shop.restock_return(p_order uuid, p_variant uuid, p_qty int, p_inspection_note text) returns void language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; w uuid; v_ref uuid; v_shipped int;
begin
  select * into o from commerce.orders where id = p_order;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('inventory.manage', o.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if o.fulfillment_status <> 'returned' or coalesce(trim(p_inspection_note), '') = '' then perform core.fail('VALIDATION', 'Chỉ nhập lại hàng trả đã kiểm, kèm biên bản'); end if;
  -- Back into the warehouse it shipped from, never more than shipped (checkout keeps one reservation per variant).
  select warehouse_id, sum(qty) into w, v_shipped from shop.stock_reservations
  where order_id = p_order and variant_id = p_variant and state = 'shipped' group by warehouse_id limit 1;
  if w is null or p_qty is null or p_qty < 1 or p_qty > v_shipped then perform core.fail('VALIDATION', 'Số lượng nhập lại vượt số đã giao'); end if;
  v_ref := extensions.uuid_generate_v5(p_order, p_variant::text);
  -- One inspection per order line: p_qty is everything that passed it.
  insert into shop.stock_movements(variant_id, warehouse_id, kind, qty, ref_id, note, actor) values (p_variant, w, 'return_restock', p_qty, v_ref, p_inspection_note, auth.uid())
  on conflict do nothing;
  if not found then perform core.fail('VALIDATION', 'Dòng hàng này đã được nhập lại'); end if;
  update shop.inventory set on_hand = on_hand + p_qty where variant_id = p_variant and warehouse_id = w;
end $$;

-- Cron: bank-transfer orders not fully paid by due date release their stock (late money goes to review).
-- Partly paid ones go to needs_review: the money received stays a liability until refunded or re-ordered.
create function shop.expire_unpaid_orders() returns int language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; r record; v_n int := 0;
begin
  for o in select * from commerce.orders where kind = 'shop' and payment_method = 'bank' and payment_status in ('unpaid','partial') and status = 'pending' and due_at < now() for update skip locked loop
    update commerce.orders set status = case when o.payment_status = 'partial' then 'needs_review' else 'expired' end, fulfillment_status = 'cancelled' where id = o.id;
    if o.payment_status = 'partial' then
      perform core.enqueue(o.entity_id, 'payment.review', 'payment.review:expired:' || o.id, o.id,
        jsonb_build_object('orderCode', o.code, 'reason', 'Quá hạn chuyển khoản, mới thu một phần', 'amount', o.paid_amount));
    end if;
    for r in select id from shop.stock_reservations where order_id = o.id and state = 'active' loop perform shop.release_reservation(r.id); end loop;
    insert into shop.fulfillment_events(order_id, from_status, to_status, note) values (o.id, o.fulfillment_status, 'cancelled', 'Quá hạn chuyển khoản');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
select cron.schedule('expire-shop-orders', '*/5 * * * *', 'select shop.expire_unpaid_orders()');

-- Spec section 6: a pending COD order must be confirmed (or the customer contacted) within cod_confirm_hours. Flag it once and tell ops; never cancel.
create function shop.flag_overdue_cod() returns int language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; v_n int := 0;
begin
  for o in select * from commerce.orders where kind = 'shop' and payment_method = 'cod' and fulfillment_status = 'new' and status not in ('cancelled','expired')
    and cod_overdue_at is null
    and created_at + make_interval(hours => coalesce((policy_snapshot -> 'params' ->> 'cod_confirm_hours')::int, 24)) <= now() for update skip locked loop
    update commerce.orders set cod_overdue_at = now() where id = o.id;
    perform core.enqueue(o.entity_id, 'cod.overdue', 'cod.overdue:' || o.id, o.id, jsonb_build_object('orderCode', o.code));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
select cron.schedule('flag-overdue-cod', '*/15 * * * *', 'select shop.flag_overdue_cod()');

-- Account cart: merge a guest's local cart on login (per variant, capped by availability), and replace items.
create function shop.merge_cart(p_lines jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cart uuid; l jsonb;
begin
  if auth.uid() is null then perform core.fail('UNAUTHENTICATED'); end if;
  insert into shop.carts(user_id) values (auth.uid()) on conflict (user_id) do update set updated_at = now() returning id into v_cart;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    insert into shop.cart_items(cart_id, variant_id, qty) values (v_cart, (l ->> 'variantId')::uuid, least(greatest((l ->> 'qty')::int, 1), 50))
    on conflict (cart_id, variant_id) do update set qty = least(shop.cart_items.qty + excluded.qty, 50);
  end loop;
  return shop.price_cart((select coalesce(jsonb_agg(jsonb_build_object('variantId', variant_id, 'qty', qty)), '[]') from shop.cart_items where cart_id = v_cart), null);
end $$;

create function shop.set_cart(p_lines jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare v_cart uuid;
begin
  if auth.uid() is null then perform core.fail('UNAUTHENTICATED'); end if;
  insert into shop.carts(user_id) values (auth.uid()) on conflict (user_id) do update set updated_at = now() returning id into v_cart;
  delete from shop.cart_items where cart_id = v_cart;
  insert into shop.cart_items(cart_id, variant_id, qty)
  select v_cart, (l ->> 'variantId')::uuid, least(greatest((l ->> 'qty')::int, 1), 50) from jsonb_array_elements(coalesce(p_lines, '[]')) l;
end $$;

-- Shop part of the guest receipt (fulfillment timeline, shipment, ritual gate).
create function commerce.get_guest_receipt_v3(p_token text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_base jsonb := commerce.get_guest_receipt_v2(p_token); -- raises NOT_FOUND for unknown/revoked tokens
begin
  return v_base || jsonb_build_object('shop', (
    select case when o.kind = 'shop' then jsonb_build_object(
      'fulfillment', o.fulfillment_status, 'method', o.payment_method, 'shippingFee', o.shipping_fee::text, 'ritualRequired', o.ritual_required,
      'ritualReadyAt', case when o.ritual_started_at is not null then o.ritual_started_at + interval '24 hours' end,
      'tracking', s.tracking, 'shippedAt', s.shipped_at,
      'events', (select coalesce(jsonb_agg(jsonb_build_object('to', e.to_status, 'at', e.created_at) order by e.created_at), '[]') from shop.fulfillment_events e where e.order_id = o.id),
      'rituals', (select coalesce(jsonb_agg(distinct pr.ritual_slug), '[]') from commerce.order_items i join shop.product_variants pv on pv.id = i.item_id join shop.products pr on pr.id = pv.product_id where i.order_id = o.id and pr.ritual_slug is not null))
    end
    from commerce.orders o left join shop.shipments s on s.order_id = o.id where o.id = (v_base ->> 'orderId')::uuid));
end $$;

alter table shop.regions enable row level security;
alter table shop.shipping_rules enable row level security;
alter table shop.shipments enable row level security;
alter table shop.carts enable row level security;
alter table shop.cart_items enable row level security;
alter table shop.fulfillment_events enable row level security;
grant select on shop.regions, shop.shipping_rules to anon, authenticated;
grant select on shop.shipments, shop.carts, shop.cart_items, shop.fulfillment_events to authenticated;
grant insert, update on shop.shipping_rules, shop.regions to authenticated;
grant all on shop.regions, shop.shipping_rules, shop.shipments, shop.carts, shop.cart_items, shop.fulfillment_events to service_role;
create policy regions_read on shop.regions for select using (active or core.auth_has_role('super_admin', null, null));
create policy regions_write on shop.regions for insert to authenticated with check (core.auth_has_role('super_admin', null, null));
create policy rules_read on shop.shipping_rules for select using (active or core.has_permission('orders.manage', entity_id, null));
create policy rules_write on shop.shipping_rules for insert to authenticated with check (core.has_permission('orders.manage', entity_id, null));
create policy rules_update on shop.shipping_rules for update to authenticated using (core.has_permission('orders.manage', entity_id, null));
create policy shipments_read on shop.shipments for select to authenticated using (core.has_permission('orders.read', entity_id, null));
create policy carts_own on shop.carts for select to authenticated using (user_id = auth.uid());
create policy cart_items_own on shop.cart_items for select to authenticated using (exists (select 1 from shop.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy fulfillment_events_read on shop.fulfillment_events for select to authenticated using (exists (select 1 from commerce.orders o where o.id = order_id));

revoke execute on function shop.rule_for, shop.price_cart, shop.create_shop_order, shop.transition_fulfillment, shop.restock_return, shop.expire_unpaid_orders,
  shop.merge_cart, shop.set_cart, commerce.get_guest_receipt_v3 from public;
revoke execute on function shop.flag_overdue_cod from public, anon, authenticated;
grant execute on function shop.price_cart, shop.create_shop_order, commerce.get_guest_receipt_v3 to anon, authenticated;
grant execute on function shop.transition_fulfillment, shop.restock_return, shop.merge_cart, shop.set_cart to authenticated;
