-- T11: identity documents. Ciphertext only (AES-256-GCM in the identity-docs Edge Function), private bucket,
-- 30-day retention with purge + tombstone. No pgsodium.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity', 'identity', false, 12582912, array['application/octet-stream'])
on conflict (id) do nothing;
-- No storage policies for anon/authenticated on 'identity': only the service role (Edge) touches these objects.

create table stay.identity_documents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  location_id uuid not null,
  booking_id uuid not null references stay.bookings(id),
  object_path text,
  key_id text,
  iv text,
  mime text not null,
  bytes int not null check (bytes > 0 and bytes <= 10485760),
  captured_by uuid not null references auth.users(id),
  captured_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  purged_at timestamptz,
  purge_attempts int not null default 0,
  last_error text,
  check (purged_at is not null or (object_path is not null and key_id is not null and iv is not null))
);
create index on stay.identity_documents (expires_at) where purged_at is null;
alter table stay.identity_documents enable row level security;
-- Staff list only metadata of documents they may read; never the path/iv.
grant select (id, booking_id, mime, bytes, captured_by, captured_at, expires_at, purged_at) on stay.identity_documents to authenticated;
grant all on stay.identity_documents to service_role;
create policy identity_read on stay.identity_documents for select to authenticated using (core.has_permission('identity.read', entity_id, location_id));

-- Edge (service) registers after encrypting; the capture permission was checked as the caller.
create function stay.identity_doc_register(p_booking uuid, p_path text, p_key_id text, p_iv text, p_mime text, p_bytes int, p_actor uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare b stay.bookings; v_id uuid;
begin
  select * into b from stay.bookings where id = p_booking;
  insert into stay.identity_documents(entity_id, location_id, booking_id, object_path, key_id, iv, mime, bytes, captured_by)
  values (b.entity_id, b.location_id, b.id, p_path, p_key_id, p_iv, p_mime, p_bytes, p_actor) returning id into v_id;
  insert into core.audit_logs(entity_id, actor_id, action, subject_type, subject_id, diff) values (b.entity_id, p_actor, 'identity.capture', 'identity_document', v_id::text, jsonb_build_object('booking', b.id));
  return v_id;
end $$;

-- Caller-side check for viewing (permission + audit); returns what the Edge needs to decrypt.
create function stay.identity_doc_for_read(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare d stay.identity_documents;
begin
  select * into d from stay.identity_documents where id = p_id;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('identity.read', d.entity_id, d.location_id) then perform core.fail('FORBIDDEN'); end if;
  if d.purged_at is not null or d.expires_at <= now() then perform core.fail('NOT_FOUND', 'Giấy tờ đã hết hạn lưu giữ và đã xóa'); end if;
  perform core.audit(d.entity_id, 'identity.view', 'identity_document', d.id::text, '{}'::jsonb);
  return jsonb_build_object('path', d.object_path, 'keyId', d.key_id, 'iv', d.iv, 'mime', d.mime, 'purged', false);
end $$;

create function stay.identity_docs_due() returns table(id uuid, object_path text) language sql stable security definer set search_path = '' as $$
  select id, object_path from stay.identity_documents where purged_at is null and expires_at <= now() order by expires_at limit 200
$$;

-- Tombstone: drop path/key/iv, keep metadata; audit without content. Replayed after a restore (runbook) so expired docs never come back.
create function stay.identity_doc_mark(p_id uuid, p_ok boolean, p_error text) returns void language plpgsql security definer set search_path = '' as $$
declare d stay.identity_documents;
begin
  select * into d from stay.identity_documents where id = p_id for update;
  if p_ok then
    update stay.identity_documents set purged_at = now(), object_path = null, key_id = null, iv = null where id = p_id;
    insert into core.audit_logs(entity_id, action, subject_type, subject_id, diff) values (d.entity_id, 'identity.purge', 'identity_document', p_id::text, jsonb_build_object('captured_at', d.captured_at));
  else
    update stay.identity_documents set purge_attempts = purge_attempts + 1, last_error = left(p_error, 300) where id = p_id;
    if d.purge_attempts + 1 >= 3 then
      perform core.enqueue(d.entity_id, 'ticket.escalated', 'identity.purge_failed:' || p_id, p_id, jsonb_build_object('title', 'Xóa giấy tờ quá hạn thất bại'));
    end if;
  end if;
end $$;

revoke execute on function stay.identity_doc_register, stay.identity_doc_for_read, stay.identity_docs_due, stay.identity_doc_mark from public, anon;
grant execute on function stay.identity_doc_for_read to authenticated;
grant execute on function stay.identity_doc_register, stay.identity_docs_due, stay.identity_doc_mark to service_role;
revoke execute on function stay.identity_doc_register, stay.identity_docs_due, stay.identity_doc_mark from authenticated;

-- Daily purge via the identity-docs Edge Function (same Vault secrets as notify).
create function core.kick_identity_purge() returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_key text;
begin
  select replace(decrypted_secret, '/notify', '/identity-docs') into v_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_key';
  if v_url is null or v_key is null or not exists (select 1 from stay.identity_docs_due()) then return; end if;
  perform net.http_post(url := v_url, headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'), body := '{"action":"purge"}'::jsonb);
end $$;
revoke execute on function core.kick_identity_purge from public, anon, authenticated;
select cron.schedule('identity-purge', '15 3 * * *', 'select core.kick_identity_purge()');
