begin;
select plan(10);
-- target: a new fake user without roles
insert into auth.users(id, email, aud, role) values ('a0000000-0000-4000-8000-0000000000f1', 'moi@example.test', 'authenticated', 'authenticated');

select tests_as('a0000000-0000-4000-8000-000000000003'); -- manager E1/L1 without MFA
select throws_ok($$select core.grant_role('a0000000-0000-4000-8000-0000000000f1','front_desk','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001')$$,
  'P0403', null, 'manager without aal2 cannot grant');
reset role;
select tests_as_aal2('a0000000-0000-4000-8000-000000000003');
select lives_ok($$select core.grant_role('a0000000-0000-4000-8000-0000000000f1','front_desk','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001')$$, 'manager (MFA) grants front_desk at own location');
select throws_ok($$select core.grant_role('a0000000-0000-4000-8000-0000000000f1','super_admin',null,null)$$, 'P0403', null, 'manager cannot grant super_admin');
select throws_ok($$select core.grant_role('a0000000-0000-4000-8000-000000000003','location_manager','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002')$$, 'P0403', null, 'manager cannot escalate self to another location');
select throws_ok($$select core.grant_role('a0000000-0000-4000-8000-0000000000f1','front_desk','e0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003')$$, 'P0403', null, 'manager cannot grant in other entity');
select lives_ok($$select core.disable_staff('a0000000-0000-4000-8000-0000000000f1', 'Nghỉ việc')$$, 'manager disables staff in scope');
reset role;
select ok(exists(select 1 from core.profiles where user_id = 'a0000000-0000-4000-8000-0000000000f1' and disabled_at is not null), 'profile disabled');
select is((select count(*)::int from core.audit_logs where subject_id = 'a0000000-0000-4000-8000-0000000000f1' and action in ('staff.grant','staff.disable')), 2, 'grant and disable audited');
select ok(not exists(select 1 from core.audit_logs where diff::text like '%moi@example.test%'), 'audit has no email in clear');
select tests_as_aal2('a0000000-0000-4000-8000-000000000004'); -- editor
select throws_ok($$select core.disable_staff('a0000000-0000-4000-8000-000000000001', 'x')$$, 'P0403', null, 'editor cannot manage staff');
select * from finish();
rollback;
