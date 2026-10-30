begin;
select plan(8);
-- fixtures from seed.sql
select tests_as('a0000000-0000-4000-8000-000000000001'); -- front_desk E1/L1
select ok(core.has_permission('booking.write','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'), 'front_desk can write bookings at own location');
select ok(not core.has_permission('booking.write','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002'), 'front_desk cannot act at other location of same entity');
select ok(not core.has_permission('booking.write','e0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003'), 'front_desk cannot act in other entity');
select ok(not core.has_permission('crm.read','e0000000-0000-4000-8000-000000000001', null), 'location-scoped role has no entity-wide permission');
reset role;
select tests_as('a0000000-0000-4000-8000-000000000004'); -- editor E1
select ok(core.has_permission('content.write','e0000000-0000-4000-8000-000000000001', null), 'editor writes content');
select ok(not core.has_permission('orders.read','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'), 'editor cannot read orders');
reset role;
-- revocation takes effect immediately even with the same JWT
update core.user_roles set disabled_at = now() where user_id = 'a0000000-0000-4000-8000-000000000001';
select tests_as('a0000000-0000-4000-8000-000000000001');
select ok(not core.has_permission('booking.write','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'), 'disabled role loses permission with old JWT');
reset role;
select tests_as_aal2('a0000000-0000-4000-8000-000000000006'); -- super_admin global (MFA)
select ok(core.has_permission('staff.manage','e0000000-0000-4000-8000-000000000002', null), 'super_admin is global');
select * from finish();
rollback;
