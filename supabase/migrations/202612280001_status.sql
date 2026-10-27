-- T19: incident records and a filtered health projection for /ops/trang-thai and /admin/trang-thai (no secrets, no provider dashboards).

create table ops_config.incident_records (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references core.entities(id),
  location_id uuid,
  title text not null,
  severity text not null check (severity in ('low','normal','high','critical')),
  status text not null default 'open' check (status in ('open','mitigated','resolved')),
  runbook text,
  opened_by uuid references auth.users(id),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);
alter table ops_config.incident_records enable row level security;
grant select on ops_config.incident_records to authenticated;
grant all on ops_config.incident_records to service_role;
create policy incidents_read on ops_config.incident_records for select to authenticated using (core.is_staff_of(entity_id, location_id));

create function ops_config.open_incident(p_location uuid, p_title text, p_severity text, p_runbook text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l core.locations; v_id uuid;
begin
  select * into l from core.locations where id = p_location;
  if not core.has_permission('ticket.manage', l.entity_id, l.id) then perform core.fail('FORBIDDEN'); end if;
  insert into ops_config.incident_records(entity_id, location_id, title, severity, runbook, opened_by) values (l.entity_id, l.id, p_title, p_severity, p_runbook, auth.uid()) returning id into v_id;
  perform core.enqueue(l.entity_id, 'ticket.escalated', 'incident:' || v_id, v_id, jsonb_build_object('title', p_title, 'priority', p_severity));
  return v_id;
end $$;

create function ops_config.resolve_incident(p_incident uuid, p_resolution text) returns void language plpgsql security definer set search_path = '' as $$
declare i ops_config.incident_records;
begin
  select * into i from ops_config.incident_records where id = p_incident for update;
  if not core.has_permission('ticket.manage', i.entity_id, i.location_id) then perform core.fail('FORBIDDEN'); end if;
  update ops_config.incident_records set status = 'resolved', resolved_at = now(), resolution = p_resolution where id = p_incident;
end $$;

create function ops_config.health_summary(p_entity uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not core.is_staff_of(p_entity) then perform core.fail('FORBIDDEN'); end if;
  return jsonb_build_object(
    'checkedAt', now(),
    'outboxOverdue', (select count(*) from core.outbox where entity_id = p_entity and status in ('pending','processing') and next_run_at < now() - interval '10 minutes'),
    'outboxDead', (select count(*) from core.outbox where entity_id = p_entity and status = 'dead'),
    'notificationsDisabled', (select count(*) from core.outbox where entity_id = p_entity and status = 'disabled' and created_at > now() - interval '7 days'),
    'feedsFailing', (select count(*) from stay.calendar_feeds where entity_id = p_entity and active and consecutive_failures >= 2),
    'feedsStale', (select count(*) from stay.calendar_feeds where entity_id = p_entity and active and import_url is not null and (last_success_at is null or last_success_at < now() - interval '1 hour')),
    'paymentsInReview', (select count(*) from commerce.payments where entity_id = p_entity and state = 'needs_review'),
    'transferReports', (select count(*) from commerce.payment_claims where entity_id = p_entity and status = 'reported'),
    'calendarConflicts', (select count(*) from stay.calendar_conflicts where entity_id = p_entity and status = 'open'),
    'ticketsEscalated', (select count(*) from stay.tickets where entity_id = p_entity and state in ('open','assigned') and escalated_at is not null),
    'identityPurgeOverdue', (select count(*) from stay.identity_documents where entity_id = p_entity and purged_at is null and expires_at < now() - interval '1 day'),
    'incidentsOpen', (select count(*) from ops_config.incident_records where entity_id = p_entity and status <> 'resolved'),
    'incidents', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'severity', severity, 'status', status, 'openedAt', opened_at, 'runbook', runbook) order by opened_at desc), '[]')
      from ops_config.incident_records where entity_id = p_entity and status <> 'resolved'),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'lastRun', last_run, 'lastStatus', last_status)), '[]') from (
      select job, max(started_at) last_run, (array_agg(status order by started_at desc))[1] last_status from ops_config.job_runs where entity_id = p_entity group by job) j),
    'cron', (select coalesce(jsonb_agg(jsonb_build_object('name', jobname, 'schedule', schedule, 'active', active)), '[]') from cron.job));
end $$;

revoke execute on function ops_config.open_incident, ops_config.resolve_incident, ops_config.health_summary from public;
grant execute on function ops_config.open_incident, ops_config.resolve_incident, ops_config.health_summary to authenticated;
