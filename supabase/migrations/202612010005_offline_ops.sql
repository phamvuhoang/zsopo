-- T12: private evidence bucket for checklist photos captured (possibly offline) on the Ops PWA.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Path convention: <location_id>/<task_id>/<media_id>.jpg. Staff of that location may write/read; nobody else.
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and exists (select 1 from core.locations l where l.id::text = (storage.foldername(name))[1] and core.has_permission('housekeeping.work', l.entity_id, l.id)));
create policy evidence_update on storage.objects for update to authenticated
  using (bucket_id = 'evidence' and owner = auth.uid());
create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and exists (select 1 from core.locations l where l.id::text = (storage.foldername(name))[1] and core.has_permission('housekeeping.read', l.entity_id, l.id)));
