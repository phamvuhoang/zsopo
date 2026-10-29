-- Shop order confirmation email: shop.order_placed was enqueued at checkout but had no renderer, so it was cancelled and never sent.
create or replace function core.render_outbox(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o core.outbox; b stay.bookings; ord commerce.orders; r stay.rooms; l core.locations; v_to text; v_vars jsonb; v_alert text; v_token text;
begin
  select * into o from core.outbox where id = p_id;
  if o.kind in ('booking.confirmed','handbook.due','checkout.thanks') then
    select * into b from stay.bookings where id = o.aggregate_id;
    if not found then return jsonb_build_object('skip', 'booking not found'); end if;
    select * into ord from commerce.orders where id = b.order_id;
    select * into r from stay.rooms where id = b.room_id;
    select * into l from core.locations where id = b.location_id;
    v_to := ord.contact_snapshot ->> 'email';
    if o.kind = 'handbook.due' and (b.state <> 'confirmed' or o.dedupe_key <> 'handbook.due:' || b.id || ':' || b.arrival) then
      return jsonb_build_object('skip', 'booking cancelled or dates changed');
    end if;
    if o.kind = 'checkout.thanks' and b.state <> 'checked_out' then return jsonb_build_object('skip', 'not checked out'); end if;
    if o.kind = 'booking.confirmed' and b.state not in ('confirmed','checked_in') then return jsonb_build_object('skip', 'booking no longer confirmed'); end if;
    if coalesce(v_to, '') = '' then return jsonb_build_object('skip', 'no email on booking'); end if;
    v_vars := jsonb_build_object(
      'name', ord.contact_snapshot ->> 'name', 'orderCode', ord.code, 'roomName', r.name, 'locationName', l.name,
      'arrival', to_char(b.arrival, 'DD/MM/YYYY'), 'departure', to_char(b.departure, 'DD/MM/YYYY'),
      'checkIn', to_char(l.check_in_time, 'HH24:MI'), 'checkOut', to_char(l.check_out_time, 'HH24:MI'),
      'paid', ord.paid_amount, 'due', greatest(ord.total - ord.paid_amount, 0),
      'guestToken', core.issue_guest_token('order', ord.id, (b.departure + 30)::timestamptz),
      'reviewUrl', (select value ->> 'reviewUrl' from ops_config.runtime_settings where key = 'site.contact'));
    return jsonb_build_object('channels', jsonb_build_array('email','zalo'), 'to', v_to, 'template', o.kind, 'vars', v_vars, 'entityId', o.entity_id);
  elsif o.kind in ('payment.reported','payment.review','payment.overpaid','calendar.sync_failed','calendar.conflict','ticket.escalated','contact.received','service.requested') then
    select value ->> 'alertEmail' into v_alert from ops_config.runtime_settings where key = 'ops.alerts';
    if coalesce(v_alert, '') = '' then return jsonb_build_object('disabled', 'Chưa cấu hình email nhận cảnh báo vận hành (ops.alerts)'); end if;
    return jsonb_build_object('channels', jsonb_build_array('email'), 'to', v_alert, 'template', 'ops.alert',
      'vars', jsonb_build_object('kind', o.kind, 'detail', o.payload::text), 'entityId', o.entity_id);
  elsif o.kind = 'campaign.email' then
    -- Re-check consent and suppression at the moment of sending.
    return (select case when not crm.has_marketing_consent(r.customer_id) then jsonb_build_object('skip', 'opted out')
        when exists (select 1 from crm.suppressions s where s.entity_id = c.entity_id and s.email = r.email) then jsonb_build_object('skip', 'suppressed')
        else jsonb_build_object('channels', jsonb_build_array('email'), 'to', r.email, 'template', 'campaign', 'entityId', c.entity_id,
          'vars', jsonb_build_object('subject', c.subject, 'body', c.body, 'unsubscribeToken', core.issue_guest_token('marketing', r.customer_id, now() + interval '180 days'))) end
      from crm.campaign_recipients r join crm.campaigns c on c.id = r.campaign_id where r.id = o.aggregate_id);
  elsif o.kind = 'newsletter.confirm' then
    -- New token per render, added (never replacing) so a link from an earlier attempt keeps working.
    select email into v_to from content.newsletter_subscriptions where id = o.aggregate_id and status <> 'subscribed';
    if v_to is null then return jsonb_build_object('skip', 'already subscribed'); end if;
    v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
    insert into content.newsletter_tokens(token_hash, subscription_id) values (extensions.digest(v_token, 'sha256'), o.aggregate_id);
    return jsonb_build_object('channels', jsonb_build_array('email'), 'to', v_to, 'template', 'newsletter.confirm', 'entityId', o.entity_id,
      'vars', jsonb_build_object('confirmToken', v_token));
  elsif o.kind = 'stock.back' then
    return (select jsonb_build_object('channels', jsonb_build_array('email'), 'to', r.email, 'template', 'stock.back', 'entityId', o.entity_id,
        'vars', jsonb_build_object('productName', pr.name || ' - ' || v.name, 'productUrl', '/shop/' || pr.slug))
      from shop.back_in_stock_requests r join shop.product_variants v on v.id = r.variant_id join shop.products pr on pr.id = v.product_id where r.id = o.aggregate_id);
  elsif o.kind = 'shop.order_placed' then
    select * into ord from commerce.orders where id = o.aggregate_id;
    if not found then return jsonb_build_object('skip', 'order not found'); end if;
    if ord.fulfillment_status = 'cancelled' then return jsonb_build_object('skip', 'order cancelled'); end if;
    v_to := ord.contact_snapshot ->> 'email';
    if coalesce(v_to, '') = '' then return jsonb_build_object('skip', 'no email on order'); end if;
    return jsonb_build_object('channels', jsonb_build_array('email'), 'to', v_to, 'template', 'shop.order_placed', 'entityId', o.entity_id,
      'vars', jsonb_build_object(
        'name', ord.contact_snapshot ->> 'name', 'orderCode', ord.code, 'total', ord.total,
        'methodNote', case when ord.payment_method = 'bank'
          then 'Chuyển khoản trước ' || to_char(ord.due_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY') || '. Mở trang đơn hàng để xem mã QR.'
          else 'Thanh toán khi nhận hàng (COD).' end,
        'ritualNote', case when ord.ritual_required then 'Đơn có sản phẩm nghi lễ nên cần thêm 24 giờ trước khi giao.' else '' end,
        'guestToken', core.issue_guest_token('order', ord.id, now() + interval '90 days'),
        'receiptPath', '/don-hang/' || ord.code));
  end if;
  return jsonb_build_object('skip', 'no renderer for ' || o.kind);
end $$;
