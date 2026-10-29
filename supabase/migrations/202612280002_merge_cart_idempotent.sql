-- Cart merge must be idempotent: the client can call it twice (React Strict Mode, two tabs, retry) before it clears the local cart,
-- and summing quantities made every call add the guest lines again. Per variant keep the larger quantity instead.
create or replace function shop.merge_cart(p_lines jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cart uuid; l jsonb;
begin
  if auth.uid() is null then perform core.fail('UNAUTHENTICATED'); end if;
  insert into shop.carts(user_id) values (auth.uid()) on conflict (user_id) do update set updated_at = now() returning id into v_cart;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    insert into shop.cart_items(cart_id, variant_id, qty) values (v_cart, (l ->> 'variantId')::uuid, least(greatest((l ->> 'qty')::int, 1), 50))
    on conflict (cart_id, variant_id) do update set qty = greatest(shop.cart_items.qty, excluded.qty);
  end loop;
  return shop.price_cart((select coalesce(jsonb_agg(jsonb_build_object('variantId', variant_id, 'qty', qty)), '[]') from shop.cart_items where cart_id = v_cart), null);
end $$;
