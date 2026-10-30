begin;
select plan(8);
select tests_make_order();
set local role anon;
select throws_ok($$select count(*) from core.customers$$, '42501', null, 'anon cannot read customers');
select throws_ok($$insert into commerce.ledger_entries default values$$, '42501', null, 'anon cannot write ledger');
select ok((select count(*) from core.locations where status = 'active') = 1, 'anon sees the one active location');
reset role;
select tests_as('a0000000-0000-4000-8000-000000000001'); -- front_desk E1/L1
select throws_ok($$insert into commerce.ledger_entries(entity_id, event_id, account, amount, source) values ('e0000000-0000-4000-8000-000000000001', gen_random_uuid(), 'cash', 1, 'x')$$, '42501', null, 'authenticated cannot insert ledger');
select is((select count(*)::int from core.customers where entity_id = 'e0000000-0000-4000-8000-000000000002'), 0, 'staff cannot read customers of other entity');
reset role;
select tests_as('a0000000-0000-4000-8000-000000000007'); -- front_desk E1/L2
select is((select count(*)::int from commerce.orders where location_id = 'c0000000-0000-4000-8000-000000000001'), 0, 'staff of other location cannot read L1 orders');
reset role;
select tests_as('a0000000-0000-4000-8000-000000000001');
select ok((select count(*) from commerce.orders where location_id = 'c0000000-0000-4000-8000-000000000001') > 0, 'own-location staff reads L1 orders');
select throws_ok($$update core.audit_logs set action = 'x'$$, '42501', null, 'audit log is not writable');
select * from finish();
rollback;
