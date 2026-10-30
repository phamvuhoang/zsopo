-- Stay and shop catalogue base (S0). Allocations/pricing in T05, shop stock RPCs in T13.

create table stay.rooms (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  code text not null,
  slug text not null unique,
  name text not null,
  room_type text not null,
  area_m2 numeric(6,1),
  capacity_adults int not null check (capacity_adults > 0),
  capacity_children int not null default 0 check (capacity_children >= 0),
  max_guests int not null check (max_guests > 0),
  amenities text[] not null default '{}',
  description text not null default '',
  photo_ids uuid[] not null default '{}',
  energy_card_id uuid,
  sellable boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  cleanliness text not null default 'ready' check (cleanliness in ('dirty','cleaning','awaiting_inspection','ready')),
  occupancy text not null default 'vacant' check (occupancy in ('vacant','occupied')),
  safety_block boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (location_id, code),
  unique (id, entity_id),
  unique (id, entity_id, location_id),
  foreign key (location_id, entity_id) references core.locations(id, entity_id),
  foreign key (energy_card_id, entity_id) references core.energy_cards(id, entity_id)
);
create trigger touch before update on stay.rooms for each row execute function core.touch();

create table shop.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort int not null default 0
);

create table shop.warehouses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  code text not null check (code in ('showroom','online')),
  name text not null,
  unique (entity_id, code),
  unique (id, entity_id),
  foreign key (location_id, entity_id) references core.locations(id, entity_id)
);

create table shop.products (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  category_id uuid not null references shop.categories(id),
  slug text not null unique,
  name text not null,
  summary text not null default '',
  description text not null default '',
  origin text not null default '',
  usage text not null default '',
  photo_ids uuid[] not null default '{}',
  energy_card_id uuid,
  ritual_slug text,
  -- ritual_slug only powers the /la QR guide page; this flag alone gates the 24h hold at checkout.
  requires_ritual boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id),
  foreign key (energy_card_id, entity_id) references core.energy_cards(id, entity_id),
  -- Energy Card is a publish condition (US-SHOP-01 / US-NRG-02).
  check (status <> 'published' or energy_card_id is not null)
);
create trigger touch before update on shop.products for each row execute function core.touch();

create table shop.product_variants (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  product_id uuid not null,
  sku text not null unique,
  name text not null,
  price bigint not null check (price >= 0),
  attrs jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, entity_id),
  foreign key (product_id, entity_id) references shop.products(id, entity_id) on delete cascade
);

create table shop.inventory (
  entity_id uuid not null,
  variant_id uuid not null,
  warehouse_id uuid not null,
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  primary key (variant_id, warehouse_id),
  check (reserved <= on_hand),
  foreign key (variant_id, entity_id) references shop.product_variants(id, entity_id),
  foreign key (warehouse_id, entity_id) references shop.warehouses(id, entity_id)
);

alter table stay.rooms enable row level security;
alter table shop.categories enable row level security;
alter table shop.warehouses enable row level security;
alter table shop.products enable row level security;
alter table shop.product_variants enable row level security;
alter table shop.inventory enable row level security;

grant select on stay.rooms, shop.categories, shop.products, shop.product_variants to anon, authenticated;
grant select on shop.warehouses, shop.inventory to authenticated;
grant insert, update on stay.rooms to authenticated;
grant insert, update on shop.products, shop.product_variants, shop.categories to authenticated;
grant all on all tables in schema stay, shop to service_role;

create policy rooms_read on stay.rooms for select
  using (status = 'published' or core.is_staff_of(entity_id, location_id));
create policy rooms_insert on stay.rooms for insert to authenticated with check (core.has_permission('room.manage', entity_id, location_id));
create policy rooms_update on stay.rooms for update to authenticated using (core.has_permission('room.manage', entity_id, location_id));
create policy categories_read on shop.categories for select using (true);
create policy categories_write on shop.categories for insert to authenticated with check (core.auth_has_role('super_admin', null, null));
create policy warehouses_read on shop.warehouses for select to authenticated using (core.is_staff_of(entity_id));
create policy products_read on shop.products for select using (status = 'published' or core.has_permission('catalog.write', entity_id, null));
create policy products_insert on shop.products for insert to authenticated with check (core.has_permission('catalog.write', entity_id, null));
create policy products_update on shop.products for update to authenticated using (core.has_permission('catalog.write', entity_id, null));
create policy variants_read on shop.product_variants for select using (exists (select 1 from shop.products p where p.id = product_id));
create policy variants_insert on shop.product_variants for insert to authenticated with check (core.has_permission('catalog.write', entity_id, null));
create policy variants_update on shop.product_variants for update to authenticated using (core.has_permission('catalog.write', entity_id, null));
create policy inventory_read on shop.inventory for select to authenticated using (core.is_staff_of(entity_id));
