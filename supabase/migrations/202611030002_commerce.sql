-- Commerce: orders, items, payments, allocations, append-only ledger, refunds, idempotency.

create table commerce.orders (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  customer_id uuid,
  kind text not null check (kind in ('stay','shop','service','manual')),
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','expired','needs_review')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','overpaid','refunded')),
  currency text not null default 'VND' check (currency = 'VND'),
  subtotal bigint not null default 0 check (subtotal >= 0),
  discount bigint not null default 0 check (discount >= 0),
  total bigint not null default 0 check (total >= 0),
  deposit_due bigint not null default 0 check (deposit_due >= 0),
  paid_amount bigint not null default 0,
  due_at timestamptz,
  source text not null default 'web' check (source in ('web','zalo','phone','walk_in','ota','b2b','qr')),
  collected_by text,
  policy_snapshot jsonb not null default '{}',
  contact_snapshot jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, entity_id),
  foreign key (location_id, entity_id) references core.locations(id, entity_id),
  foreign key (customer_id, entity_id) references core.customers(id, entity_id)
);
create trigger touch before update on commerce.orders for each row execute function core.touch();
create index on commerce.orders (entity_id, location_id, created_at desc);
create index on commerce.orders (customer_id);

create table commerce.order_items (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  order_id uuid not null,
  item_type text not null check (item_type in ('room_night','service','product','shipping','adjustment','manual')),
  item_id uuid,
  title text not null default '',
  qty int not null check (qty <> 0),
  unit_price bigint not null,
  amount bigint not null,
  revenue_source text check (revenue_source in ('room','beverage','own_service','product','cohost_service')),
  service_date date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  completed_at timestamptz,
  reversal_of uuid references commerce.order_items(id),
  snapshot jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, entity_id),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id),
  check (item_type in ('shipping','adjustment') or revenue_source is not null)
);
create index on commerce.order_items (order_id);
create index on commerce.order_items (entity_id, revenue_source, service_date);

create table commerce.payments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  provider text not null check (provider in ('vietqr_manual','bank_transfer','cash','cod','ota','card_terminal')),
  provider_ref text not null,
  amount bigint not null check (amount > 0),
  state text not null default 'received' check (state in ('pending','received','allocated','needs_review','failed')),
  received_at timestamptz not null,
  recorded_by uuid references auth.users(id),
  evidence_id uuid,
  evidence_note text,
  review_reason text,
  shift_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (provider, provider_ref),
  unique (id, entity_id),
  foreign key (evidence_id, entity_id) references core.media(id, entity_id)
);
create trigger touch before update on commerce.payments for each row execute function core.touch();

create table commerce.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  payment_id uuid not null,
  order_id uuid not null,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  foreign key (payment_id, entity_id) references commerce.payments(id, entity_id),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id)
);
create index on commerce.payment_allocations (order_id);

-- Ledger: one event = one business fact (unique source_key), many balanced lines. Append-only.
create table commerce.ledger_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  kind text not null,
  source_key text not null unique,
  order_id uuid,
  payment_id uuid,
  reversal_of uuid references commerce.ledger_events(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (id, entity_id),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id)
);

create table commerce.ledger_entries (
  id bigint generated always as identity primary key,
  entity_id uuid not null,
  event_id uuid not null,
  account text not null check (account in (
    'cash','bank','ota_clearing','cod_clearing','deposit_liability','customer_credit','receivable',
    'revenue_room','revenue_beverage','revenue_own_service','revenue_product','revenue_cohost_service',
    'shipping_income','refund_payable','discount')),
  amount bigint not null, -- debit positive, credit negative; each event sums to 0
  source text not null,
  recognition_date date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  created_at timestamptz not null default now(),
  foreign key (event_id, entity_id) references commerce.ledger_events(id, entity_id)
);
create index on commerce.ledger_entries (entity_id, account, recognition_date);
create index on commerce.ledger_entries (event_id);

create function commerce.forbid_mutation() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'append-only table %: create a reversal instead', tg_table_name using errcode = '42501';
end $$;
create trigger ledger_events_append_only before update or delete on commerce.ledger_events for each row execute function commerce.forbid_mutation();
create trigger ledger_entries_append_only before update or delete on commerce.ledger_entries for each row execute function commerce.forbid_mutation();
create trigger audit_append_only before update or delete on core.audit_logs for each row execute function commerce.forbid_mutation();

-- Balanced-event guard, checked at commit.
create function commerce.check_event_balanced() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select coalesce(sum(amount), 0) from commerce.ledger_entries where event_id = new.event_id) <> 0 then
    raise exception 'ledger event % is not balanced', new.event_id using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger ledger_balanced after insert on commerce.ledger_entries
  deferrable initially deferred for each row execute function commerce.check_event_balanced();

-- Post an event with lines [{account, amount}] once per source_key. Returns event id (existing on replay).
create function commerce.post_ledger(p_entity uuid, p_location uuid, p_kind text, p_source_key text, p_order uuid, p_payment uuid, p_lines jsonb, p_recognition date default null, p_reversal_of uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; l jsonb;
begin
  insert into commerce.ledger_events(entity_id, location_id, kind, source_key, order_id, payment_id, reversal_of, created_by)
  values (p_entity, p_location, p_kind, p_source_key, p_order, p_payment, p_reversal_of, auth.uid())
  on conflict (source_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from commerce.ledger_events where source_key = p_source_key;
    return v_id;
  end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    if (l->>'amount')::bigint <> 0 then
      insert into commerce.ledger_entries(entity_id, event_id, account, amount, source, recognition_date)
      values (p_entity, v_id, l->>'account', (l->>'amount')::bigint, p_kind,
              coalesce(p_recognition, (now() at time zone 'Asia/Ho_Chi_Minh')::date));
    end if;
  end loop;
  return v_id;
end $$;
revoke execute on function commerce.post_ledger from public, anon, authenticated;

create table commerce.refund_requests (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  order_id uuid not null,
  amount bigint not null check (amount > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','paid')),
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  evidence_id uuid,
  evidence_note text,
  created_at timestamptz not null default now(),
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id),
  check (approved_by is null or approved_by <> requested_by)
);

create table commerce.idempotency_keys (
  scope text not null,
  key text not null,
  request_hash text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (scope, key)
);

-- Look up / claim an idempotency key. Returns stored result, raises VERSION_CONFLICT-like error on hash mismatch.
create function commerce.idem_get(p_scope text, p_key text, p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r commerce.idempotency_keys;
begin
  -- Serialise concurrent requests with the same key until the first one commits its result.
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_key, 0));
  select * into r from commerce.idempotency_keys where scope = p_scope and key = p_key for update;
  if not found then return null; end if;
  if r.request_hash <> p_hash then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0409', detail = 'same key, different request';
  end if;
  return r.result;
end $$;

create function commerce.idem_put(p_scope text, p_key text, p_hash text, p_result jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  insert into commerce.idempotency_keys(scope, key, request_hash, result) values (p_scope, p_key, p_hash, p_result);
  return p_result;
end $$;
revoke execute on function commerce.idem_get, commerce.idem_put from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS (reads only; writes via definer RPCs)
alter table commerce.orders enable row level security;
alter table commerce.order_items enable row level security;
alter table commerce.payments enable row level security;
alter table commerce.payment_allocations enable row level security;
alter table commerce.ledger_events enable row level security;
alter table commerce.ledger_entries enable row level security;
alter table commerce.refund_requests enable row level security;
alter table commerce.idempotency_keys enable row level security;

grant select on commerce.orders, commerce.order_items, commerce.payments, commerce.payment_allocations,
  commerce.ledger_events, commerce.ledger_entries, commerce.refund_requests to authenticated;
grant all on all tables in schema commerce to service_role;

create policy orders_read on commerce.orders for select to authenticated
  using (core.has_permission('orders.read', entity_id, location_id));
create policy items_read on commerce.order_items for select to authenticated
  using (exists (select 1 from commerce.orders o where o.id = order_id));
create policy payments_read on commerce.payments for select to authenticated
  using (core.has_permission('payment.record', entity_id, null) or core.has_permission('ledger.read', entity_id, null)
         or exists (select 1 from commerce.payment_allocations pa join commerce.orders o on o.id = pa.order_id where pa.payment_id = payments.id));
create policy allocations_read on commerce.payment_allocations for select to authenticated
  using (exists (select 1 from commerce.orders o where o.id = order_id));
create policy ledger_events_read on commerce.ledger_events for select to authenticated using (core.has_permission('ledger.read', entity_id, null));
create policy ledger_entries_read on commerce.ledger_entries for select to authenticated using (core.has_permission('ledger.read', entity_id, null));
create policy refunds_read on commerce.refund_requests for select to authenticated
  using (exists (select 1 from commerce.orders o where o.id = order_id));
