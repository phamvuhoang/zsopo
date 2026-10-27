-- Shared test helpers (loaded first; pg_prove runs files alphabetically).
begin;
select plan(1);
create or replace function tests_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests_as_aal2(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
end $$;
-- An L1 stay order for E1 (as postgres, bypassing RLS).
create or replace function tests_make_order(p_location uuid default 'c0000000-0000-4000-8000-000000000001') returns uuid language sql as $$
  insert into commerce.orders(entity_id, location_id, kind, total) values ('e0000000-0000-4000-8000-000000000001', p_location, 'stay', 1000000) returning id
$$;
select ok(true, 'helpers loaded');
select * from finish();
commit;
