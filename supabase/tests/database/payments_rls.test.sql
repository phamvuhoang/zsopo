begin;
select plan(7);
set local role anon;
select throws_ok($$select count(*) from commerce.payments$$, '42501', null, 'anon cannot read payments');
select throws_ok($$select commerce.record_payment_atomic(gen_random_uuid(), 'cash', 'x', 1, now())$$, '42501', null, 'anon cannot call record_payment_atomic');
select throws_ok($$select count(*) from core.guest_access_tokens$$, '42501', null, 'anon cannot read guest tokens');
reset role;
select tests_as('a0000000-0000-4000-8000-000000000001'); -- front_desk
select throws_ok($$insert into commerce.payments(entity_id, provider, provider_ref, amount, received_at) values ('e0000000-0000-4000-8000-000000000001','cash','x',1,now())$$, '42501', null, 'staff cannot insert payments directly');
select throws_ok($$update commerce.orders set paid_amount = 999$$, '42501', null, 'staff cannot edit orders directly');
select throws_ok($$select count(*) from core.guest_access_tokens$$, '42501', null, 'staff cannot read guest tokens');
select throws_ok($$select core.issue_guest_token('order', gen_random_uuid(), now() + interval '1 day')$$, '42501', null, 'staff cannot mint guest tokens');
select * from finish();
rollback;
