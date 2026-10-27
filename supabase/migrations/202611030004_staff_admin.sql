-- Staff administration: profile bootstrap, scoped grant/revoke/disable with audit, MFA hints.

create function core.on_auth_user_created() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into core.profiles(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function core.on_auth_user_created();

create function core.forbid(p_msg text default 'Không có quyền thực hiện thao tác này') returns void language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_msg using errcode = 'P0403';
end $$;

-- Would the caller be allowed if they completed MFA? Used by the app to redirect to /auth/mfa instead of 403.
create function core.permission_needs_mfa(p_action text, p_entity uuid, p_location uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' and exists (
    select 1 from core.user_roles ur
    join core.role_permissions rp on rp.role = ur.role and rp.action = p_action and rp.requires_aal2
    join core.profiles pr on pr.user_id = ur.user_id and pr.disabled_at is null
    where ur.user_id = auth.uid() and ur.disabled_at is null
      and ((ur.entity_id is null and ur.role = 'super_admin') or ur.entity_id = p_entity)
      and (ur.location_id is null or ur.location_id = p_location))
$$;

create function core.grant_role(p_user uuid, p_role text, p_entity uuid, p_location uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_role in ('front_desk','housekeeping') then
    if p_location is null or not core.has_permission('staff.manage', p_entity, p_location) then perform core.forbid(); end if;
  elsif not core.auth_has_role('super_admin', null, null) or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    perform core.forbid('Chỉ quản trị hệ thống (đã xác thực MFA) được cấp vai trò này');
  end if;
  if p_user = auth.uid() then perform core.forbid('Không tự cấp quyền cho chính mình'); end if;

  insert into core.user_roles(user_id, role, entity_id, location_id, granted_by)
  values (p_user, p_role, p_entity, p_location, auth.uid())
  on conflict do nothing
  returning id into v_id;
  perform core.audit(p_entity, 'staff.grant', 'user', p_user::text,
    jsonb_build_object('role', p_role, 'location_id', p_location));
  return v_id;
end $$;

create function core.revoke_role(p_role_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r core.user_roles;
begin
  select * into r from core.user_roles where id = p_role_id and disabled_at is null for update;
  if not found then return; end if;
  if r.role in ('front_desk','housekeeping') then
    if not core.has_permission('staff.manage', r.entity_id, r.location_id) then perform core.forbid(); end if;
  elsif not core.auth_has_role('super_admin', null, null) or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    perform core.forbid();
  end if;
  update core.user_roles set disabled_at = now() where id = p_role_id;
  perform core.audit(r.entity_id, 'staff.revoke', 'user', r.user_id::text, jsonb_build_object('role', r.role), p_reason);
end $$;

-- Disable a staff account. Caller must manage every active role the target holds.
create function core.disable_staff(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r core.user_roles; v_entity uuid;
begin
  if p_user = auth.uid() then perform core.forbid('Không tự vô hiệu hóa chính mình'); end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Cần lý do' using errcode = '22023'; end if;
  for r in select * from core.user_roles where user_id = p_user and disabled_at is null loop
    v_entity := coalesce(v_entity, r.entity_id);
    if r.role in ('front_desk','housekeeping') then
      if not core.has_permission('staff.manage', r.entity_id, r.location_id) then perform core.forbid(); end if;
    elsif not core.auth_has_role('super_admin', null, null) or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
      perform core.forbid();
    end if;
  end loop;
  if v_entity is null and not core.auth_has_role('super_admin', null, null) then perform core.forbid(); end if;
  update core.profiles set disabled_at = now() where user_id = p_user;
  perform core.audit(v_entity, 'staff.disable', 'user', p_user::text, '{}'::jsonb, p_reason);
end $$;

create function core.enable_staff(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not core.auth_has_role('super_admin', null, null) or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then perform core.forbid(); end if;
  update core.profiles set disabled_at = null where user_id = p_user;
  perform core.audit(null, 'staff.enable', 'user', p_user::text, '{}'::jsonb, p_reason);
end $$;

-- Staff directory for the caller's manageable scope (no emails of out-of-scope users).
create function core.staff_directory()
returns table(user_id uuid, email text, display_name text, disabled_at timestamptz, roles jsonb)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text, p.display_name, p.disabled_at,
         jsonb_agg(jsonb_build_object('id', ur.id, 'role', ur.role, 'entity_id', ur.entity_id, 'location_id', ur.location_id) order by ur.created_at)
  from core.user_roles ur
  join auth.users u on u.id = ur.user_id
  join core.profiles p on p.user_id = ur.user_id
  where ur.disabled_at is null
    and (core.has_permission('staff.manage', ur.entity_id, ur.location_id) or core.auth_has_role('super_admin', null, null))
  group by u.id, u.email, p.display_name, p.disabled_at
$$;

-- Roles of the caller (for navigation/UI hints only; server actions re-check).
create function core.my_roles()
returns table(role text, entity_id uuid, location_id uuid)
language sql stable security definer set search_path = '' as $$
  select ur.role, ur.entity_id, ur.location_id from core.user_roles ur
  join core.profiles p on p.user_id = ur.user_id and p.disabled_at is null
  where ur.user_id = auth.uid() and ur.disabled_at is null
$$;

revoke execute on function core.on_auth_user_created, core.forbid from public, anon, authenticated;
revoke execute on function core.permission_needs_mfa, core.grant_role, core.revoke_role, core.disable_staff,
  core.enable_staff, core.staff_directory, core.my_roles from public, anon;
grant execute on function core.permission_needs_mfa, core.grant_role, core.revoke_role, core.disable_staff,
  core.enable_staff, core.staff_directory, core.my_roles to authenticated;
