-- T07: outbox worker contract, templates, delivery logs, journey message rendering, schedules.

create table ops_config.notification_templates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  key text not null,
  channel text not null check (channel in ('email','zalo')),
  subject text not null default '',
  body text not null,
  allowed_vars text[] not null,
  version int not null default 1,
  active boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create unique index notification_templates_active on ops_config.notification_templates (entity_id, key, channel) where active;

create table ops_config.delivery_logs (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references core.outbox(id),
  entity_id uuid,
  channel text not null,
  provider text not null,
  recipient_masked text,
  status text not null check (status in ('sent','failed','disabled','skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index on ops_config.delivery_logs (outbox_id);

alter table ops_config.notification_templates enable row level security;
alter table ops_config.delivery_logs enable row level security;
grant select on ops_config.notification_templates, ops_config.delivery_logs to authenticated;
grant update (subject, body, active) on ops_config.notification_templates to authenticated;
grant all on ops_config.notification_templates, ops_config.delivery_logs to service_role;
create policy templates_read on ops_config.notification_templates for select to authenticated using (core.has_permission('notifications.read', entity_id, null));
create policy templates_update on ops_config.notification_templates for update to authenticated using (core.has_permission('notifications.manage', entity_id, null));
create policy delivery_read on ops_config.delivery_logs for select to authenticated using (core.has_permission('notifications.read', entity_id, null));

-- ---------------------------------------------------------------- worker contract (service role only)
create function core.claim_outbox(p_limit int, p_lease interval, p_worker text) returns setof core.outbox
language sql security definer set search_path = '' as $$
  update core.outbox o set status = 'processing', locked_until = now() + p_lease, attempts = o.attempts + 1, updated_at = now(),
    last_error = coalesce(o.last_error, '') || ''
  where o.id in (
    select id from core.outbox
    where status in ('pending','processing') and next_run_at <= now() and (locked_until is null or locked_until < now())
    order by next_run_at
    for update skip locked
    limit p_limit)
  returning o.*
$$;

-- Exponential schedule 1/5/15/60 minutes, dead-letter after 5 attempts.
create function core.complete_outbox(p_id uuid, p_status text, p_provider_id text, p_error text) returns void
language plpgsql security definer set search_path = '' as $$
declare o core.outbox;
begin
  select * into o from core.outbox where id = p_id for update;
  if not found then return; end if;
  update core.outbox set
    status = case p_status
      when 'sent' then 'sent'
      when 'disabled' then 'disabled'
      when 'skipped' then 'cancelled'
      else case when o.attempts >= 5 then 'dead' else 'pending' end end,
    next_run_at = case when p_status = 'failed' and o.attempts < 5
      then now() + (array[interval '1 minute', interval '5 minutes', interval '15 minutes', interval '60 minutes'])[o.attempts] else next_run_at end,
    locked_until = null, provider_id = coalesce(p_provider_id, provider_id), last_error = p_error, updated_at = now()
  where id = p_id;
end $$;

create function core.log_delivery(p_outbox uuid, p_channel text, p_provider text, p_recipient text, p_status text, p_provider_id text, p_error text) returns void
language sql security definer set search_path = '' as $$
  insert into ops_config.delivery_logs(outbox_id, entity_id, channel, provider, recipient_masked, status, provider_id, error)
  select p_outbox, o.entity_id, p_channel, p_provider,
    case when p_recipient like '%@%' then left(p_recipient, 2) || '***@' || split_part(p_recipient, '@', 2) else left(coalesce(p_recipient, ''), 3) || '***' end,
    p_status, p_provider_id, p_error
  from core.outbox o where o.id = p_outbox
$$;

-- What to send for a job: recipient + template + allow-listed vars, or {skip}. Mints a fresh guest link token when needed.
create function core.render_outbox(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o core.outbox; b stay.bookings; ord commerce.orders; r stay.rooms; l core.locations; v_to text; v_vars jsonb; v_alert text;
begin
  select * into o from core.outbox where id = p_id;
  if o.kind in ('booking.confirmed','handbook.due','checkout.thanks') then
    select * into b from stay.bookings where id = o.aggregate_id;
    if not found then return jsonb_build_object('skip', 'booking not found'); end if;
    select * into ord from commerce.orders where id = b.order_id;
    select * into r from stay.rooms where id = b.room_id;
    select * into l from core.locations where id = b.location_id;
    v_to := ord.contact_snapshot ->> 'email';
    if o.kind = 'handbook.due' and (b.state <> 'confirmed' or o.dedupe_key <> 'handbook.due:' || b.id || ':' || b.arrival) then
      return jsonb_build_object('skip', 'booking cancelled or dates changed');
    end if;
    if o.kind = 'checkout.thanks' and b.state <> 'checked_out' then return jsonb_build_object('skip', 'not checked out'); end if;
    if o.kind = 'booking.confirmed' and b.state not in ('confirmed','checked_in') then return jsonb_build_object('skip', 'booking no longer confirmed'); end if;
    if coalesce(v_to, '') = '' then return jsonb_build_object('skip', 'no email on booking'); end if;
    v_vars := jsonb_build_object(
      'name', ord.contact_snapshot ->> 'name', 'orderCode', ord.code, 'roomName', r.name, 'locationName', l.name,
      'arrival', to_char(b.arrival, 'DD/MM/YYYY'), 'departure', to_char(b.departure, 'DD/MM/YYYY'),
      'checkIn', to_char(l.check_in_time, 'HH24:MI'), 'checkOut', to_char(l.check_out_time, 'HH24:MI'),
      'paid', ord.paid_amount, 'due', greatest(ord.total - ord.paid_amount, 0),
      'guestToken', core.issue_guest_token('order', ord.id, (b.departure + 30)::timestamptz),
      'reviewUrl', (select value ->> 'reviewUrl' from ops_config.runtime_settings where key = 'site.contact'));
    return jsonb_build_object('channels', jsonb_build_array('email','zalo'), 'to', v_to, 'template', o.kind, 'vars', v_vars, 'entityId', o.entity_id);
  elsif o.kind in ('payment.reported','payment.review','payment.overpaid','calendar.sync_failed','calendar.conflict','ticket.escalated') then
    select value ->> 'alertEmail' into v_alert from ops_config.runtime_settings where key = 'ops.alerts';
    if coalesce(v_alert, '') = '' then return jsonb_build_object('disabled', 'Chưa cấu hình email nhận cảnh báo vận hành (ops.alerts)'); end if;
    return jsonb_build_object('channels', jsonb_build_array('email'), 'to', v_alert, 'template', 'ops.alert',
      'vars', jsonb_build_object('kind', o.kind, 'detail', o.payload::text), 'entityId', o.entity_id);
  end if;
  return jsonb_build_object('skip', 'no renderer for ' || o.kind);
end $$;

-- Hold sweeper for all rooms (cron, every minute) on the DB clock.
create function stay.expire_all_holds() returns int language plpgsql security definer set search_path = '' as $$
declare v_room uuid; v_total int := 0;
begin
  for v_room in select distinct room_id from stay.bookings where state = 'held' and held_until <= now() loop
    perform 1 from stay.rooms where id = v_room for update;
    v_total := v_total + stay.expire_room_holds(v_room);
  end loop;
  return v_total;
end $$;

-- Staff resend of a dead/failed/disabled job (audited).
create function core.retry_outbox(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o core.outbox;
begin
  select * into o from core.outbox where id = p_id for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('notifications.manage', o.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if o.status not in ('dead','failed','disabled') then perform core.fail('INVALID_TRANSITION', 'Chỉ gửi lại tin lỗi hoặc đang tắt'); end if;
  update core.outbox set status = 'pending', attempts = 0, next_run_at = now(), locked_until = null where id = p_id;
  perform core.audit(o.entity_id, 'outbox.retry', 'outbox', p_id::text, jsonb_build_object('kind', o.kind));
end $$;

revoke execute on function core.claim_outbox, core.complete_outbox, core.log_delivery, core.render_outbox, stay.expire_all_holds, core.retry_outbox from public, anon, authenticated;
grant execute on function core.claim_outbox, core.complete_outbox, core.log_delivery, core.render_outbox, stay.expire_all_holds to service_role;
grant execute on function core.retry_outbox to authenticated;

-- ---------------------------------------------------------------- schedules
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Kick the notify Edge Function if its URL/key are configured in Vault (vault secrets: notify_url, notify_key).
create function core.kick_notify() returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_key';
  if v_url is null or v_key is null then return; end if;
  if not exists (select 1 from core.outbox where status in ('pending','processing') and next_run_at <= now()) then return; end if;
  perform net.http_post(url := v_url, headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'), body := '{}'::jsonb);
end $$;
revoke execute on function core.kick_notify from public, anon, authenticated;

select cron.schedule('expire-holds', '* * * * *', 'select stay.expire_all_holds()');
select cron.schedule('kick-notify', '* * * * *', 'select core.kick_notify()');

-- Receipt v2: server clock for countdowns and the real delivery status of the confirmation message.
create or replace function commerce.get_guest_receipt_v2(p_token text) returns jsonb language sql stable security definer set search_path = '' as $$
  select commerce.get_guest_receipt(p_token) || jsonb_build_object(
    'serverNow', now(),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('channel', l.channel, 'status', l.status, 'at', l.created_at) order by l.created_at)
      from stay.bookings b join core.outbox o on o.aggregate_id = b.id and o.kind = 'booking.confirmed'
      join ops_config.delivery_logs l on l.outbox_id = o.id
      where b.order_id = core.guest_subject(p_token, 'order')), '[]'::jsonb),
    'confirmationQueued', exists (select 1 from stay.bookings b join core.outbox o on o.aggregate_id = b.id and o.kind = 'booking.confirmed'
      where b.order_id = core.guest_subject(p_token, 'order') and o.status in ('pending','processing')))
$$;
revoke execute on function commerce.get_guest_receipt_v2 from public;
grant execute on function commerce.get_guest_receipt_v2 to anon, authenticated;
