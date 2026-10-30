-- T08: OTA iCal feeds (import + per-connection export), raw blocks, projection into allocations, conflicts, job runs.

create table ops_config.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  subject_id uuid,
  entity_id uuid,
  status text not null check (status in ('success','failed','partial')),
  detail jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on ops_config.job_runs (job, started_at desc);

create table stay.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  provider text not null check (provider in ('airbnb','booking','agoda','expedia','other')),
  import_url text check (import_url is null or import_url ~ '^https://'),
  export_token_hash bytea unique,
  export_token_hint text,
  horizon_days int not null default 365 check (horizon_days between 30 and 730),
  active boolean not null default true,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures int not null default 0,
  last_error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (room_id, entity_id, location_id) references stay.rooms(id, entity_id, location_id)
);

create table stay.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references stay.calendar_feeds(id),
  room_id uuid not null,
  external_uid text not null,
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  status text not null default 'active' check (status in ('active','removed')),
  source_payload_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (feed_id, external_uid)
);

create table stay.calendar_conflicts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  room_id uuid not null,
  feed_id uuid not null references stay.calendar_feeds(id),
  block_id uuid not null references stay.calendar_blocks(id),
  booking_id uuid references stay.bookings(id),
  night date not null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  resolved_by uuid references auth.users(id),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (block_id, night)
);

alter table ops_config.job_runs enable row level security;
alter table stay.calendar_feeds enable row level security;
alter table stay.calendar_blocks enable row level security;
alter table stay.calendar_conflicts enable row level security;

grant select on ops_config.job_runs, stay.calendar_blocks, stay.calendar_conflicts to authenticated;
-- Import URLs embed OTA secrets: column-level grants keep them out of every staff query.
grant select (id, entity_id, location_id, room_id, provider, export_token_hint, horizon_days, active, last_attempt_at, last_success_at, consecutive_failures, last_error, created_at)
  on stay.calendar_feeds to authenticated;
grant all on ops_config.job_runs, stay.calendar_feeds, stay.calendar_blocks, stay.calendar_conflicts to service_role;

create policy job_runs_read on ops_config.job_runs for select to authenticated using (core.has_permission('calendar.manage', entity_id, null) or core.has_permission('config.manage', entity_id, null));
create policy feeds_read on stay.calendar_feeds for select to authenticated using (core.has_permission('room.read', entity_id, location_id));
create policy blocks_read on stay.calendar_blocks for select to authenticated using (exists (select 1 from stay.calendar_feeds f where f.id = feed_id));
create policy conflicts_read on stay.calendar_conflicts for select to authenticated using (core.has_permission('room.read', entity_id, location_id));

-- Reconcile one feed snapshot. p_events = parsed full fetch; null = fetch/parse failed (keep last-good blocks).
create function stay.reconcile_feed(p_feed uuid, p_events jsonb, p_error text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f stay.calendar_feeds; r stay.rooms; e jsonb; blk stay.calendar_blocks; v_today date; v_horizon date;
  n date; v_run_start date; v_conflicts int := 0; v_alloc stay.room_allocations; v_upserts int := 0; v_removed int := 0;
begin
  select * into f from stay.calendar_feeds where id = p_feed for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  -- Same lock as every other writer of this room.
  select * into r from stay.rooms where id = f.room_id for update;
  update stay.calendar_feeds set last_attempt_at = now() where id = f.id;

  if p_events is null then
    update stay.calendar_feeds set consecutive_failures = consecutive_failures + 1, last_error = left(coalesce(p_error, 'unknown'), 300)
    where id = f.id returning * into f;
    if f.consecutive_failures >= 2 then
      perform core.enqueue(f.entity_id, 'calendar.sync_failed', 'calendar.sync_failed:' || f.id || ':' || (f.last_success_at is null)::text || ':' || coalesce(f.last_success_at::text, ''),
        f.id, jsonb_build_object('roomId', f.room_id, 'provider', f.provider, 'failures', f.consecutive_failures, 'error', f.last_error));
    end if;
    insert into ops_config.job_runs(job, subject_id, entity_id, status, detail, finished_at)
    values ('ical-sync', f.id, f.entity_id, 'failed', jsonb_build_object('error', f.last_error), now());
    return jsonb_build_object('status', 'failed', 'failures', f.consecutive_failures);
  end if;

  perform stay.expire_room_holds(r.id);
  v_today := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_horizon := v_today + f.horizon_days;

  -- 1. Upsert raw blocks seen in this full fetch.
  for e in select * from jsonb_array_elements(p_events) loop
    if (e ->> 'cancelled')::boolean then continue; end if;
    -- Dates changed: release the old projection; step 3 rebuilds it.
    update stay.room_allocations a set active = false, released_at = now()
    from stay.calendar_blocks b
    where b.feed_id = f.id and b.external_uid = e ->> 'uid' and a.source_id = b.id and a.active
      and (b.starts_on <> (e ->> 'start')::date or b.ends_on <> (e ->> 'end')::date);
    insert into stay.calendar_blocks(feed_id, room_id, external_uid, starts_on, ends_on, source_payload_hash)
    values (f.id, r.id, e ->> 'uid', (e ->> 'start')::date, (e ->> 'end')::date, md5(e::text))
    on conflict (feed_id, external_uid) do update set
      starts_on = excluded.starts_on, ends_on = excluded.ends_on, status = 'active', removed_at = null, last_seen_at = now(),
      source_payload_hash = excluded.source_payload_hash
    returning * into blk;
    v_upserts := v_upserts + 1;
  end loop;

  -- 2. Events absent from a valid full fetch (or cancelled) inside the horizon are removed.
  for blk in
    select b.* from stay.calendar_blocks b
    where b.feed_id = f.id and b.status = 'active' and b.ends_on > v_today and b.starts_on < v_horizon
      and not exists (select 1 from jsonb_array_elements(p_events) x where x ->> 'uid' = b.external_uid and not (x ->> 'cancelled')::boolean)
  loop
    update stay.calendar_blocks set status = 'removed', removed_at = now() where id = blk.id;
    update stay.room_allocations set active = false, released_at = now() where source_id = blk.id and active;
    update stay.calendar_conflicts set status = 'resolved', resolution = 'OTA event removed', resolved_at = now() where block_id = blk.id and status = 'open';
    v_removed := v_removed + 1;
  end loop;

  -- 3. Project active blocks night by night: free nights become one 'ota' allocation per contiguous run;
  --    nights held by a direct hold/booking become conflicts (both kept, staff decides).
  for blk in select * from stay.calendar_blocks where feed_id = f.id and status = 'active' and ends_on > v_today order by starts_on loop
    v_run_start := null;
    for n in select d::date from generate_series(greatest(blk.starts_on, v_today), blk.ends_on, interval '1 day') d loop
      select a.* into v_alloc from stay.room_allocations a
      where a.room_id = r.id and a.active and a.occupied_range && stay.stay_range(r.location_id, n, n + 1) and n < blk.ends_on
      limit 1;
      if n < blk.ends_on and v_alloc.id is null then
        v_run_start := coalesce(v_run_start, n);
        continue;
      end if;
      if v_run_start is not null then
        insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
        values (r.entity_id, r.location_id, r.id, stay.stay_range(r.location_id, v_run_start, n), 'ota', blk.id);
        v_run_start := null;
      end if;
      if n < blk.ends_on and v_alloc.kind in ('hold','booking') then
        insert into stay.calendar_conflicts(entity_id, location_id, room_id, feed_id, block_id, booking_id, night)
        values (r.entity_id, r.location_id, r.id, f.id, blk.id, v_alloc.source_id, n)
        on conflict (block_id, night) do nothing;
        if found then v_conflicts := v_conflicts + 1; end if;
      end if;
    end loop;
  end loop;

  if v_conflicts > 0 then
    perform core.enqueue(f.entity_id, 'calendar.conflict', 'calendar.conflict:' || f.id || ':' || now()::text, f.id,
      jsonb_build_object('roomId', r.id, 'provider', f.provider, 'nights', v_conflicts));
  end if;
  update stay.calendar_feeds set last_success_at = now(), consecutive_failures = 0, last_error = null where id = f.id;
  insert into ops_config.job_runs(job, subject_id, entity_id, status, detail, finished_at)
  values ('ical-sync', f.id, f.entity_id, 'success', jsonb_build_object('upserts', v_upserts, 'removed', v_removed, 'conflicts', v_conflicts), now());
  return jsonb_build_object('status', 'success', 'upserts', v_upserts, 'removed', v_removed, 'conflicts', v_conflicts);
end $$;

-- Feeds due for import (Edge worker, every 15 minutes). Returns the secret URL to the service role only.
create function stay.feeds_due(p_interval interval default interval '15 minutes')
returns table(id uuid, import_url text, horizon_days int) language sql stable security definer set search_path = '' as $$
  select f.id, f.import_url, f.horizon_days from stay.calendar_feeds f
  where f.active and f.import_url is not null and (f.last_attempt_at is null or f.last_attempt_at <= now() - p_interval)
$$;

create function stay.add_calendar_feed(p_room uuid, p_provider text, p_import_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r stay.rooms; v_id uuid;
begin
  select * into r from stay.rooms where id = p_room;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('calendar.manage', r.entity_id, r.location_id) then perform core.fail('FORBIDDEN'); end if;
  if p_import_url is not null and p_import_url !~ '^https://' then perform core.fail('VALIDATION', 'Liên kết iCal phải dùng https'); end if;
  insert into stay.calendar_feeds(entity_id, location_id, room_id, provider, import_url, created_by)
  values (r.entity_id, r.location_id, p_room, p_provider, nullif(trim(p_import_url), ''), auth.uid()) returning id into v_id;
  perform core.audit(r.entity_id, 'calendar.feed_add', 'room', p_room::text, jsonb_build_object('provider', p_provider));
  return v_id;
end $$;

-- New export token (raw returned once); the previous one stops working immediately.
create function stay.rotate_export_token(p_feed uuid) returns text language plpgsql security definer set search_path = '' as $$
declare f stay.calendar_feeds; v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
begin
  select * into f from stay.calendar_feeds where id = p_feed for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if auth.uid() is not null and not core.has_permission('calendar.manage', f.entity_id, f.location_id) then perform core.fail('FORBIDDEN'); end if;
  update stay.calendar_feeds set export_token_hash = extensions.digest(v_token, 'sha256'), export_token_hint = left(v_token, 4) where id = p_feed;
  if auth.uid() is not null then perform core.audit(f.entity_id, 'calendar.export_rotate', 'calendar_feed', p_feed::text, '{}'::jsonb); end if;
  return v_token;
end $$;

-- Busy intervals for an export token: direct holds/bookings, maintenance and other feeds' OTA blocks. No guest data.
create function stay.export_busy(p_token text) returns table(uid text, starts_on date, ends_on date)
language sql stable security definer set search_path = '' as $$
  with f as (select * from stay.calendar_feeds where export_token_hash = extensions.digest(coalesce(p_token, ''), 'sha256') and active)
  select 'zsopo-' || a.id::text,
    (lower(a.occupied_range) at time zone l.timezone)::date,
    (upper(a.occupied_range) at time zone l.timezone)::date
  from f
  join core.locations l on l.id = f.location_id
  join stay.room_allocations a on a.room_id = f.room_id and a.active
  where upper(a.occupied_range) > now() - interval '1 day'
    and not exists (select 1 from stay.calendar_blocks b where b.id = a.source_id and b.feed_id = f.id)
$$;

create function stay.resolve_conflict(p_conflict uuid, p_resolution text) returns void language plpgsql security definer set search_path = '' as $$
declare c stay.calendar_conflicts;
begin
  select * into c from stay.calendar_conflicts where id = p_conflict for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('calendar.manage', c.entity_id, c.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_resolution), '') = '' then perform core.fail('VALIDATION', 'Ghi rõ cách xử lý'); end if;
  update stay.calendar_conflicts set status = 'resolved', resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now() where block_id = c.block_id and status = 'open';
  perform core.audit(c.entity_id, 'calendar.conflict_resolve', 'room', c.room_id::text, '{}'::jsonb, p_resolution);
end $$;

revoke execute on function stay.reconcile_feed, stay.feeds_due, stay.add_calendar_feed, stay.rotate_export_token, stay.export_busy, stay.resolve_conflict from public;
grant execute on function stay.reconcile_feed, stay.feeds_due, stay.export_busy to service_role;
grant execute on function stay.add_calendar_feed, stay.rotate_export_token, stay.resolve_conflict to authenticated;

-- Every 15 minutes: kick the ical-sync Edge Function (same Vault secrets as notify; URL derived).
create function core.kick_ical_sync() returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_key text;
begin
  select replace(decrypted_secret, '/notify', '/ical-sync') into v_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_key';
  if v_url is null or v_key is null or not exists (select 1 from stay.calendar_feeds where active and import_url is not null) then return; end if;
  perform net.http_post(url := v_url, headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'), body := '{}'::jsonb);
end $$;
revoke execute on function core.kick_ical_sync from public, anon, authenticated;
select cron.schedule('ical-sync', '*/15 * * * *', 'select core.kick_ical_sync()');
