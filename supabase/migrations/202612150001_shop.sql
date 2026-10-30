-- T13: shop stock reservations/movements (atomic, idempotent), ritual QR content, back-in-stock with consent, publish gate.

create table shop.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  order_id uuid not null,
  variant_id uuid not null,
  warehouse_id uuid not null,
  qty int not null check (qty > 0),
  state text not null default 'active' check (state in ('active','released','shipped')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id),
  foreign key (variant_id, warehouse_id) references shop.inventory(variant_id, warehouse_id)
);
create index on shop.stock_reservations (order_id);

create table shop.stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null,
  warehouse_id uuid not null,
  kind text not null check (kind in ('receive','reserve','release','ship','return_restock','adjust')),
  qty int not null,
  ref_id uuid,
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
-- One release/ship/restock effect per reservation or return: replays are no-ops.
create unique index stock_movements_once on shop.stock_movements (kind, ref_id) where kind in ('reserve','release','ship','return_restock');

create table shop.ritual_contents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  slug text not null unique,
  title text not null,
  intro text not null default '',
  steps jsonb not null default '[]', -- [{title, text}]
  video_url text check (video_url is null or video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz not null default now()
);

create table shop.back_in_stock_requests (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  variant_id uuid not null references shop.product_variants(id),
  email text not null,
  consent_at timestamptz not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (variant_id, email)
);

-- Reserve from the online warehouse first, then the showroom. Row locks make the last unit go to one buyer only.
create function shop.reserve_stock(p_order uuid, p_variant uuid, p_qty int, p_expires timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv shop.inventory; v_id uuid;
begin
  select i.* into inv from shop.inventory i join shop.warehouses w on w.id = i.warehouse_id
  where i.variant_id = p_variant and i.on_hand - i.reserved >= p_qty
  order by case w.code when 'online' then 0 else 1 end
  limit 1 for update of i;
  if not found then perform core.fail('SOLD_OUT', 'Sản phẩm vừa hết hàng'); end if;
  update shop.inventory set reserved = reserved + p_qty, updated_at = now() where variant_id = inv.variant_id and warehouse_id = inv.warehouse_id;
  insert into shop.stock_reservations(entity_id, order_id, variant_id, warehouse_id, qty, expires_at) values (inv.entity_id, p_order, p_variant, inv.warehouse_id, p_qty, p_expires)
  returning id into v_id;
  insert into shop.stock_movements(variant_id, warehouse_id, kind, qty, ref_id, actor) values (p_variant, inv.warehouse_id, 'reserve', p_qty, v_id, auth.uid());
  return v_id;
end $$;

create function shop.release_reservation(p_reservation uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r shop.stock_reservations;
begin
  select * into r from shop.stock_reservations where id = p_reservation for update;
  if not found or r.state <> 'active' then return; end if;
  update shop.inventory set reserved = reserved - r.qty, updated_at = now() where variant_id = r.variant_id and warehouse_id = r.warehouse_id;
  update shop.stock_reservations set state = 'released' where id = r.id;
  insert into shop.stock_movements(variant_id, warehouse_id, kind, qty, ref_id, actor) values (r.variant_id, r.warehouse_id, 'release', r.qty, r.id, auth.uid());
end $$;

create function shop.ship_reservation(p_reservation uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r shop.stock_reservations;
begin
  select * into r from shop.stock_reservations where id = p_reservation for update;
  if not found or r.state <> 'active' then return; end if;
  update shop.inventory set on_hand = on_hand - r.qty, reserved = reserved - r.qty, updated_at = now() where variant_id = r.variant_id and warehouse_id = r.warehouse_id;
  update shop.stock_reservations set state = 'shipped' where id = r.id;
  insert into shop.stock_movements(variant_id, warehouse_id, kind, qty, ref_id, actor) values (r.variant_id, r.warehouse_id, 'ship', r.qty, r.id, auth.uid());
end $$;

create function shop.receive_stock(p_variant uuid, p_warehouse uuid, p_qty int, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare v shop.product_variants;
begin
  select * into v from shop.product_variants where id = p_variant;
  if not core.has_permission('inventory.manage', v.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if p_qty = 0 or coalesce(trim(p_note), '') = '' then perform core.fail('VALIDATION', 'Cần số lượng và chứng từ nhập/điều chỉnh'); end if;
  insert into shop.inventory(entity_id, variant_id, warehouse_id, on_hand) values (v.entity_id, p_variant, p_warehouse, greatest(p_qty, 0))
  on conflict (variant_id, warehouse_id) do update set on_hand = shop.inventory.on_hand + p_qty, updated_at = now();
  insert into shop.stock_movements(variant_id, warehouse_id, kind, qty, note, actor) values (p_variant, p_warehouse, case when p_qty > 0 then 'receive' else 'adjust' end, p_qty, p_note, auth.uid());
end $$;

-- Energy Card is a publish condition (also enforced by a CHECK on products).
create function shop.publish_product(p_product uuid) returns void language plpgsql security definer set search_path = '' as $$
declare p shop.products;
begin
  select * into p from shop.products where id = p_product for update;
  if not found or not core.has_permission('catalog.write', p.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if p.energy_card_id is null or not exists (select 1 from core.energy_cards c where c.id = p.energy_card_id and c.status = 'published') then
    perform core.fail('VALIDATION', 'Cần bảng năng lượng đã duyệt trước khi mở bán');
  end if;
  if not exists (select 1 from shop.product_variants where product_id = p.id and active) then perform core.fail('VALIDATION', 'Cần ít nhất một biến thể'); end if;
  update shop.products set status = 'published' where id = p.id;
  perform core.audit(p.entity_id, 'product.publish', 'product', p.id::text, '{}'::jsonb);
end $$;

-- Public availability: in stock or not, never the quantity.
create function shop.variant_availability(p_variants uuid[]) returns table(variant_id uuid, in_stock boolean)
language sql stable security definer set search_path = '' as $$
  select v.id, coalesce(sum(i.on_hand - i.reserved), 0) > 0
  from shop.product_variants v join shop.products p on p.id = v.product_id and p.status = 'published'
  left join shop.inventory i on i.variant_id = v.id
  where v.id = any(p_variants) and v.active group by v.id
$$;

create function shop.request_back_in_stock(p_variant uuid, p_email text, p_consent boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v shop.product_variants;
begin
  perform core.rate_limit('back_in_stock', 10);
  if not coalesce(p_consent, false) then perform core.fail('VALIDATION', 'Cần đồng ý nhận email thông báo'); end if;
  if coalesce(p_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform core.fail('VALIDATION', 'Email không hợp lệ'); end if;
  select * into v from shop.product_variants where id = p_variant and active;
  if not found then perform core.fail('NOT_FOUND'); end if;
  insert into shop.back_in_stock_requests(entity_id, variant_id, email, consent_at) values (v.entity_id, p_variant, lower(trim(p_email)), now())
  on conflict (variant_id, email) do update set consent_at = now(), notified_at = null;
end $$;

-- Back in stock: when availability goes from 0 to > 0, queue one email per pending request.
create function shop.on_inventory_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_before int; v_after int; r shop.back_in_stock_requests;
begin
  select coalesce(sum(on_hand - reserved), 0) into v_after from shop.inventory where variant_id = new.variant_id;
  v_before := v_after - (new.on_hand - new.reserved) + coalesce(old.on_hand - old.reserved, 0);
  if v_before <= 0 and v_after > 0 then
    for r in select * from shop.back_in_stock_requests where variant_id = new.variant_id and notified_at is null loop
      perform core.enqueue(r.entity_id, 'stock.back', 'stock.back:' || r.id || ':' || r.consent_at, r.id, '{}'::jsonb);
      update shop.back_in_stock_requests set notified_at = now() where id = r.id;
    end loop;
  end if;
  return null;
end $$;
create trigger on_inventory_change after insert or update of on_hand, reserved on shop.inventory for each row execute function shop.on_inventory_change();

alter table shop.stock_reservations enable row level security;
alter table shop.stock_movements enable row level security;
alter table shop.ritual_contents enable row level security;
alter table shop.back_in_stock_requests enable row level security;
grant select on shop.ritual_contents to anon, authenticated;
grant insert, update on shop.ritual_contents to authenticated;
grant select on shop.stock_reservations, shop.stock_movements, shop.back_in_stock_requests to authenticated;
grant all on shop.stock_reservations, shop.stock_movements, shop.ritual_contents, shop.back_in_stock_requests to service_role;
create policy ritual_read on shop.ritual_contents for select using (status = 'published' or core.has_permission('catalog.write', entity_id, null));
create policy ritual_write on shop.ritual_contents for insert to authenticated with check (core.has_permission('catalog.write', entity_id, null));
create policy ritual_update on shop.ritual_contents for update to authenticated using (core.has_permission('catalog.write', entity_id, null));
create policy reservations_read on shop.stock_reservations for select to authenticated using (core.has_permission('inventory.manage', entity_id, null) or core.has_permission('orders.read', entity_id, null));
create policy movements_read on shop.stock_movements for select to authenticated using (exists (select 1 from shop.inventory i where i.variant_id = stock_movements.variant_id));
create policy bis_read on shop.back_in_stock_requests for select to authenticated using (core.has_permission('crm.read', entity_id, null));

revoke execute on function shop.reserve_stock, shop.release_reservation, shop.ship_reservation, shop.receive_stock, shop.publish_product,
  shop.variant_availability, shop.request_back_in_stock, shop.on_inventory_change from public;
grant execute on function shop.variant_availability, shop.request_back_in_stock to anon, authenticated;
grant execute on function shop.receive_stock, shop.publish_product to authenticated;

-- Admin: create a draft product with its Energy Card and first variant in one call.
create function shop.create_product(p jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_entity uuid := (p ->> 'entityId')::uuid; v_card uuid; v_product uuid; v_variant uuid;
begin
  if not core.has_permission('catalog.write', v_entity, null) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p ->> 'name'), '') = '' or coalesce((p ->> 'price')::bigint, -1) < 0 or coalesce(trim(p ->> 'sku'), '') = '' then
    perform core.fail('VALIDATION', 'Cần tên, SKU và giá');
  end if;
  insert into core.energy_cards(entity_id, title, purpose, origin, usage, frequency, stones, chakras, ritual_video_url, status)
  values (v_entity, p ->> 'name', coalesce(p ->> 'purpose', ''), coalesce(p ->> 'origin', ''), coalesce(p ->> 'usage', ''), nullif(p ->> 'frequency', ''),
          coalesce(array(select jsonb_array_elements_text(p -> 'stones')), '{}'), coalesce(array(select jsonb_array_elements_text(p -> 'chakras')), '{}'),
          nullif(p ->> 'videoUrl', ''), case when coalesce(p ->> 'purpose', '') <> '' and coalesce(p ->> 'origin', '') <> '' and coalesce(p ->> 'usage', '') <> '' then 'published' else 'draft' end)
  returning id into v_card;
  insert into shop.products(entity_id, category_id, slug, name, summary, origin, usage, energy_card_id, requires_ritual)
  values (v_entity, (p ->> 'categoryId')::uuid, p ->> 'slug', p ->> 'name', coalesce(p ->> 'purpose', ''), coalesce(p ->> 'origin', ''), coalesce(p ->> 'usage', ''), v_card,
          coalesce((p ->> 'requiresRitual')::boolean, false))
  returning id into v_product;
  insert into shop.product_variants(entity_id, product_id, sku, name, price) values (v_entity, v_product, upper(p ->> 'sku'), coalesce(nullif(p ->> 'variantName', ''), 'Tiêu chuẩn'), (p ->> 'price')::bigint)
  returning id into v_variant;
  insert into shop.inventory(entity_id, variant_id, warehouse_id, on_hand) select v_entity, v_variant, w.id, 0 from shop.warehouses w where w.entity_id = v_entity;
  perform core.audit(v_entity, 'product.create', 'product', v_product::text, jsonb_build_object('sku', p ->> 'sku'));
  return v_product;
exception when unique_violation then
  perform core.fail('VALIDATION', 'Slug hoặc SKU đã tồn tại');
end $$;
revoke execute on function shop.create_product from public;
grant execute on function shop.create_product to authenticated;
