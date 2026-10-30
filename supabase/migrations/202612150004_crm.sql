-- T16: CRM 360 (tags, notes, timeline), verified merges, dynamic segments (allow-listed filters), consent-aware campaigns.

create table crm.tags (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  name text not null,
  unique (entity_id, name)
);
create table crm.customer_tags (
  customer_id uuid not null references core.customers(id) on delete cascade,
  tag_id uuid not null references crm.tags(id) on delete cascade,
  primary key (customer_id, tag_id)
);
create table crm.customer_notes (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  customer_id uuid not null references core.customers(id),
  body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table crm.customer_merge_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  survivor_id uuid not null references core.customers(id),
  merged_id uuid not null references core.customers(id),
  reason text not null,
  verified_by uuid not null references auth.users(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create table crm.segments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  name text not null,
  filter_json jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table crm.campaigns (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  name text not null,
  channel text not null default 'email' check (channel = 'email'),
  subject text not null,
  body text not null,
  segment_id uuid references crm.segments(id),
  status text not null default 'draft' check (status in ('draft','snapshotted','sending','sent','cancelled')),
  created_by uuid references auth.users(id),
  sent_by uuid references auth.users(id),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create table crm.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references crm.campaigns(id),
  customer_id uuid not null references core.customers(id),
  email text not null,
  status text not null default 'pending' check (status in ('pending','queued','sent','skipped_optout','suppressed','failed')),
  unique (campaign_id, customer_id)
);
create table crm.suppressions (
  entity_id uuid not null references core.entities(id),
  email text not null,
  reason text not null check (reason in ('bounce','complaint','manual')),
  created_at timestamptz not null default now(),
  primary key (entity_id, email)
);

alter table core.guest_access_tokens drop constraint guest_access_tokens_scope_check;
alter table core.guest_access_tokens add constraint guest_access_tokens_scope_check check (scope in ('order','stay','marketing'));

-- Current marketing consent: latest grant not revoked.
create function crm.has_marketing_consent(p_customer uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.consent_records where customer_id = p_customer and purpose = 'marketing' and revoked_at is null)
$$;

-- Allow-listed dynamic filter: minVisits, lastStayAfter, lastStayBefore, hasShopOrder, source, tag, marketingConsent.
create function crm.segment_ids(p_entity uuid, p_filter jsonb) returns setof uuid language plpgsql stable security definer set search_path = '' as $$
declare k text;
begin
  if not core.has_permission('crm.read', p_entity, null) then perform core.fail('FORBIDDEN'); end if;
  for k in select jsonb_object_keys(coalesce(p_filter, '{}')) loop
    if k not in ('minVisits','lastStayAfter','lastStayBefore','hasShopOrder','source','tag','marketingConsent') then perform core.fail('VALIDATION', 'Bộ lọc không hợp lệ: ' || k); end if;
  end loop;
  return query
  select c.id from core.customers c
  left join lateral (select count(*) filter (where b.state in ('checked_out','checked_in','confirmed')) as visits, max(b.arrival) filter (where b.state in ('checked_out','checked_in')) as last_stay
    from commerce.orders o join stay.bookings b on b.order_id = o.id where o.customer_id = c.id) s on true
  where c.entity_id = p_entity and c.merged_into is null
    and (p_filter ->> 'minVisits' is null or s.visits >= (p_filter ->> 'minVisits')::int)
    and (p_filter ->> 'lastStayAfter' is null or s.last_stay >= (p_filter ->> 'lastStayAfter')::date)
    and (p_filter ->> 'lastStayBefore' is null or s.last_stay <= (p_filter ->> 'lastStayBefore')::date)
    and (p_filter ->> 'hasShopOrder' is null or (p_filter ->> 'hasShopOrder')::boolean = exists (select 1 from commerce.orders o where o.customer_id = c.id and o.kind = 'shop'))
    and (p_filter ->> 'source' is null or c.source = p_filter ->> 'source')
    and (p_filter ->> 'tag' is null or exists (select 1 from crm.customer_tags ct join crm.tags t on t.id = ct.tag_id where ct.customer_id = c.id and t.name = p_filter ->> 'tag'))
    and (p_filter ->> 'marketingConsent' is null or (p_filter ->> 'marketingConsent')::boolean = crm.has_marketing_consent(c.id));
end $$;

create function crm.segment_count(p_entity uuid, p_filter jsonb) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from crm.segment_ids(p_entity, p_filter)
$$;

-- All rows of a segment (export, campaign snapshot); segment_list pages it for screens.
create function crm.segment_rows(p_entity uuid, p_filter jsonb)
returns table(id uuid, display_name text, source text, email text, phone text, marketing boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.display_name, c.source,
    (select value from core.customer_contacts where customer_id = c.id and kind = 'email' limit 1),
    (select value from core.customer_contacts where customer_id = c.id and kind = 'phone' limit 1),
    crm.has_marketing_consent(c.id), c.created_at
  from core.customers c where c.id in (select crm.segment_ids(p_entity, p_filter)) order by c.created_at desc
$$;

create function crm.segment_list(p_entity uuid, p_filter jsonb, p_limit int default 50, p_offset int default 0)
returns table(id uuid, display_name text, source text, email text, phone text, marketing boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from crm.segment_rows(p_entity, p_filter) limit least(p_limit, 200) offset p_offset
$$;

-- Export needs crm.export (MFA) and is audited.
create function crm.export_segment(p_entity uuid, p_filter jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not core.has_permission('crm.export', p_entity, null) then perform core.fail('FORBIDDEN'); end if;
  perform core.audit(p_entity, 'crm.export', 'segment', null, jsonb_build_object('filter', p_filter));
  -- one scalar jsonb: PostgREST max_rows (1000) truncates row sets but not a single value
  return coalesce((select jsonb_agg(jsonb_build_object('displayName', l.display_name, 'email', l.email, 'phone', l.phone, 'source', l.source, 'marketing', l.marketing))
    from crm.segment_rows(p_entity, p_filter) l), '[]'::jsonb);
end $$;

-- Same contact = a suggestion only; never proof of identity.
create function crm.duplicate_suggestions(p_entity uuid) returns table(kind text, normalized text, customer_ids uuid[])
language sql stable security definer set search_path = '' as $$
  select cc.kind, cc.normalized, array_agg(distinct cc.customer_id)
  from core.customer_contacts cc join core.customers c on c.id = cc.customer_id and c.merged_into is null
  where cc.entity_id = p_entity and core.has_permission('crm.read', p_entity, null)
  group by cc.kind, cc.normalized having count(distinct cc.customer_id) > 1 limit 100
$$;

create function crm.merge_customers(p_survivor uuid, p_merged uuid, p_reason text, p_verified boolean) returns void language plpgsql security definer set search_path = '' as $$
declare s core.customers; m core.customers;
begin
  select * into s from core.customers where id = p_survivor for update;
  select * into m from core.customers where id = p_merged for update;
  if s.id is null or m.id is null or s.entity_id <> m.entity_id or s.id = m.id then perform core.fail('VALIDATION', 'Hai hồ sơ không hợp lệ để gộp'); end if;
  if not core.has_permission('crm.write', s.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if not coalesce(p_verified, false) or coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Gộp cần xác minh với khách và ghi lý do'); end if;
  if m.user_id is not null and s.user_id is not null and m.user_id <> s.user_id then perform core.fail('VALIDATION', 'Hai hồ sơ thuộc hai tài khoản khác nhau'); end if;
  insert into crm.customer_merge_events(entity_id, survivor_id, merged_id, reason, verified_by, snapshot)
  values (s.entity_id, s.id, m.id, p_reason, auth.uid(), jsonb_build_object('merged', to_jsonb(m), 'orders', (select coalesce(jsonb_agg(id), '[]') from commerce.orders where customer_id = m.id)));
  update commerce.orders set customer_id = s.id where customer_id = m.id;
  update core.customer_contacts set customer_id = s.id where customer_id = m.id
    and not exists (select 1 from core.customer_contacts x where x.customer_id = s.id and x.kind = customer_contacts.kind and x.normalized = customer_contacts.normalized);
  update core.consent_records set customer_id = s.id where customer_id = m.id;
  update crm.customer_notes set customer_id = s.id where customer_id = m.id;
  insert into crm.customer_tags(customer_id, tag_id) select s.id, tag_id from crm.customer_tags where customer_id = m.id on conflict do nothing;
  update core.customers set merged_into = s.id, user_id = coalesce(s.user_id, m.user_id) where id = m.id;
  update core.customers set user_id = coalesce(s.user_id, m.user_id) where id = s.id;
  perform core.audit(s.entity_id, 'crm.merge', 'customer', s.id::text, jsonb_build_object('merged', m.id), p_reason);
end $$;

-- 360 timeline (GĐ0: stays, shop orders, services, payments, notes). Learning/consult/points intentionally absent.
create function crm.customer_timeline(p_customer uuid) returns table(kind text, at timestamptz, title text, detail jsonb) language plpgsql stable security definer set search_path = '' as $$
declare c core.customers;
begin
  select * into c from core.customers where id = p_customer;
  if not found or not core.has_permission('crm.read', c.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  return query
  select * from (
    select 'order'::text, o.created_at, (case o.kind when 'stay' then 'Đặt phòng ' else 'Đơn hàng ' end) || o.code, jsonb_build_object('status', o.status, 'payment', o.payment_status, 'total', o.total)
      from commerce.orders o where o.customer_id = c.id
    union all
    select 'stay', b.created_at, 'Lưu trú ' || b.arrival || ' đến ' || b.departure, jsonb_build_object('state', b.state)
      from stay.bookings b join commerce.orders o on o.id = b.order_id where o.customer_id = c.id and b.state in ('checked_in','checked_out')
    union all
    select 'service', r.created_at, 'Dịch vụ', jsonb_build_object('state', r.state, 'qty', r.qty)
      from stay.service_requests r join stay.bookings b on b.id = r.booking_id join commerce.orders o on o.id = b.order_id where o.customer_id = c.id
    union all
    select 'payment', p.received_at, 'Thanh toán ' || p.provider, jsonb_build_object('amount', pa.amount)
      from commerce.payment_allocations pa join commerce.payments p on p.id = pa.payment_id join commerce.orders o on o.id = pa.order_id where o.customer_id = c.id
    union all
    select 'note', n.created_at, 'Ghi chú', jsonb_build_object('body', n.body) from crm.customer_notes n where n.customer_id = c.id
  ) t(kind, at, title, detail) order by at desc;
end $$;

create function crm.add_note(p_customer uuid, p_body text) returns void language plpgsql security definer set search_path = '' as $$
declare c core.customers;
begin
  select * into c from core.customers where id = p_customer;
  if not core.has_permission('crm.write', c.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  insert into crm.customer_notes(entity_id, customer_id, body, created_by) values (c.entity_id, c.id, left(p_body, 2000), auth.uid());
end $$;

create function crm.tag_customer(p_customer uuid, p_tag text) returns void language plpgsql security definer set search_path = '' as $$
declare c core.customers; v_tag uuid;
begin
  select * into c from core.customers where id = p_customer;
  if not core.has_permission('crm.write', c.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  insert into crm.tags(entity_id, name) values (c.entity_id, trim(p_tag)) on conflict (entity_id, name) do update set name = excluded.name returning id into v_tag;
  insert into crm.customer_tags(customer_id, tag_id) values (c.id, v_tag) on conflict do nothing;
end $$;

-- Campaign: snapshot recipients (consent + email + not suppressed), then explicit send with a re-check per recipient.
create function crm.snapshot_campaign(p_campaign uuid) returns int language plpgsql security definer set search_path = '' as $$
declare cp crm.campaigns; seg crm.segments; v_n int;
begin
  select * into cp from crm.campaigns where id = p_campaign for update;
  if not core.has_permission('crm.write', cp.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if cp.status not in ('draft','snapshotted') then perform core.fail('INVALID_TRANSITION'); end if;
  select * into seg from crm.segments where id = cp.segment_id;
  delete from crm.campaign_recipients where campaign_id = cp.id and status = 'pending';
  insert into crm.campaign_recipients(campaign_id, customer_id, email)
  select cp.id, l.id, lower(l.email) from crm.segment_rows(cp.entity_id, coalesce(seg.filter_json, '{}') || '{"marketingConsent":true}') l
  where l.email is not null and not exists (select 1 from crm.suppressions s where s.entity_id = cp.entity_id and s.email = lower(l.email))
  on conflict do nothing;
  get diagnostics v_n = row_count;
  update crm.campaigns set status = 'snapshotted' where id = cp.id;
  return v_n;
end $$;

create function crm.send_campaign(p_campaign uuid) returns int language plpgsql security definer set search_path = '' as $$
declare cp crm.campaigns; r crm.campaign_recipients; v_i int := 0;
begin
  select * into cp from crm.campaigns where id = p_campaign for update;
  if not core.has_permission('campaign.send', cp.entity_id, null) then perform core.fail('FORBIDDEN', 'Gửi chiến dịch cần quyền và xác thực hai lớp'); end if;
  if cp.status <> 'snapshotted' then perform core.fail('INVALID_TRANSITION', 'Cần chốt danh sách người nhận trước'); end if;
  update crm.campaigns set status = 'sending', sent_by = auth.uid(), sent_at = now() where id = cp.id;
  for r in select * from crm.campaign_recipients where campaign_id = cp.id and status = 'pending' loop
    if not crm.has_marketing_consent(r.customer_id) then
      update crm.campaign_recipients set status = 'skipped_optout' where id = r.id;
    elsif exists (select 1 from crm.suppressions s where s.entity_id = cp.entity_id and s.email = r.email) then
      update crm.campaign_recipients set status = 'suppressed' where id = r.id;
    else
      -- Throttle: 30 emails per minute.
      perform core.enqueue(cp.entity_id, 'campaign.email', 'campaign:' || cp.id || ':' || r.customer_id, r.id, '{}'::jsonb, now() + make_interval(secs => (v_i / 30) * 60));
      update crm.campaign_recipients set status = 'queued' where id = r.id;
      v_i := v_i + 1;
    end if;
  end loop;
  update crm.campaigns set status = 'sent' where id = cp.id;
  perform core.audit(cp.entity_id, 'campaign.send', 'campaign', cp.id::text, jsonb_build_object('queued', v_i));
  return v_i;
end $$;

create function crm.unsubscribe(p_token text) returns void language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := core.guest_subject(p_token, 'marketing');
begin
  if v_customer is null then perform core.fail('NOT_FOUND', 'Liên kết hủy không hợp lệ'); end if;
  update core.consent_records set revoked_at = now() where customer_id = v_customer and purpose = 'marketing' and revoked_at is null;
end $$;

alter table crm.tags enable row level security;
alter table crm.customer_tags enable row level security;
alter table crm.customer_notes enable row level security;
alter table crm.customer_merge_events enable row level security;
alter table crm.segments enable row level security;
alter table crm.campaigns enable row level security;
alter table crm.campaign_recipients enable row level security;
alter table crm.suppressions enable row level security;
grant select on all tables in schema crm to authenticated;
grant insert, update on crm.segments, crm.campaigns, crm.suppressions to authenticated;
grant all on all tables in schema crm to service_role;
create policy tags_read on crm.tags for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy customer_tags_read on crm.customer_tags for select to authenticated using (exists (select 1 from core.customers c where c.id = customer_id));
create policy notes_read on crm.customer_notes for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy merges_read on crm.customer_merge_events for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy segments_all on crm.segments for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy segments_insert on crm.segments for insert to authenticated with check (core.has_permission('crm.write', entity_id, null));
create policy campaigns_read on crm.campaigns for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy campaigns_insert on crm.campaigns for insert to authenticated with check (core.has_permission('crm.write', entity_id, null) and status = 'draft');
create policy campaigns_update on crm.campaigns for update to authenticated using (core.has_permission('crm.write', entity_id, null) and status = 'draft');
create policy recipients_read on crm.campaign_recipients for select to authenticated using (exists (select 1 from crm.campaigns c where c.id = campaign_id));
create policy suppressions_read on crm.suppressions for select to authenticated using (core.has_permission('crm.read', entity_id, null));
create policy suppressions_insert on crm.suppressions for insert to authenticated with check (core.has_permission('crm.write', entity_id, null));

revoke execute on all functions in schema crm from public;
grant execute on function crm.segment_count, crm.segment_list, crm.export_segment, crm.duplicate_suggestions, crm.merge_customers, crm.customer_timeline,
  crm.add_note, crm.tag_customer, crm.snapshot_campaign, crm.send_campaign, crm.has_marketing_consent to authenticated;
grant execute on function crm.unsubscribe to anon, authenticated;
