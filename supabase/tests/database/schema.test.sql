begin;
select plan(10);
select has_schema(s) from unnest(array['core','commerce','stay','shop','content','crm','ops_config']) s;
select has_extension('btree_gist');
select tests_make_order();
-- entity mismatch: an order item cannot point to an order of another entity
select throws_ok($$
  insert into commerce.order_items(entity_id, order_id, item_type, qty, unit_price, amount, revenue_source)
  select 'e0000000-0000-4000-8000-000000000002', o.id, 'product', 1, 1000, 1000, 'product'
  from commerce.orders o where o.entity_id = 'e0000000-0000-4000-8000-000000000001' limit 1
$$, '23503', null, 'order_items composite FK blocks cross-entity parent');
select isnt_empty($$select 1 from stay.rooms where code ~ '^P[0-9]{2}$' having count(*) = 13 and count(*) filter (where sellable) = 9$$, 'seed has 13 rooms, 9 sellable');
select * from finish();
rollback;
