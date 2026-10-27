-- T06: guest capabilities, atomic payment recording with ledger + outbox, transfer reports, refunds, receipts.

-- Guest RPCs live in commerce; anon still has no table privileges there.
grant usage on schema commerce to anon;

-- ---------------------------------------------------------------- guest capability tokens
-- 256-bit random token, only its sha256 is stored. Raw token is returned once to the server that sets the HttpOnly cookie.
create function core.issue_guest_token(p_scope text, p_subject uuid, p_expires timestamptz) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
begin
  insert into core.guest_access_tokens(token_hash, scope, subject_id, expires_at)
  values (extensions.digest(v_token, 'sha256'), p_scope, p_subject, p_expires);
  return v_token;
end $$;

create function core.guest_subject(p_token text, p_scope text) returns uuid
language sql stable security definer set search_path = '' as $$
  select subject_id from core.guest_access_tokens
  where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256') and scope = p_scope and revoked_at is null and expires_at > now()
$$;
revoke execute on function core.issue_guest_token, core.guest_subject from public, anon, authenticated;

-- Re-issue a token for an order the caller can already open (email magic links, idempotent replays).
create function commerce.exchange_guest_token(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order uuid := core.guest_subject(p_token, 'order'); v_code text;
begin
  perform core.rate_limit('guest_token', 30);
  if v_order is null then perform core.fail('NOT_FOUND', 'Liên kết không hợp lệ hoặc đã hết hạn'); end if;
  select code into v_code from commerce.orders where id = v_order;
  return jsonb_build_object('orderCode', v_code, 'token', p_token);
end $$;

-- Hold now also issues the order capability. The stored idempotent result never contains the raw token.
alter function stay.create_stay_hold(uuid, jsonb, uuid, uuid, jsonb, text, text, text) rename to create_stay_hold_core;
revoke execute on function stay.create_stay_hold_core from public, anon, authenticated;

create function stay.create_stay_hold(p_quote uuid, p_guest jsonb, p_policy_version uuid, p_idempotency uuid, p_consents jsonb,
  p_arrival_time text default null, p_notes text default null, p_source text default 'web')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb; b stay.bookings;
begin
  v_result := stay.create_stay_hold_core(p_quote, p_guest, p_policy_version, p_idempotency, p_consents, p_arrival_time, p_notes, p_source);
  select * into b from stay.bookings where id = (v_result ->> 'bookingId')::uuid;
  return v_result || jsonb_build_object('guestToken',
    core.issue_guest_token('order', b.order_id, (b.departure + 30)::timestamptz));
end $$;
revoke execute on function stay.create_stay_hold from public;
grant execute on function stay.create_stay_hold to anon, authenticated;

-- ---------------------------------------------------------------- transfer reports ("Tôi đã chuyển khoản")
create table commerce.payment_claims (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  order_id uuid not null,
  status text not null default 'reported' check (status in ('reported','matched','rejected')),
  reported_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  foreign key (order_id, entity_id) references commerce.orders(id, entity_id)
);
create unique index payment_claims_open on commerce.payment_claims (order_id) where status = 'reported';
alter table commerce.payment_claims enable row level security;
grant select on commerce.payment_claims to authenticated;
grant all on commerce.payment_claims to service_role;
create policy claims_read on commerce.payment_claims for select to authenticated using (exists (select 1 from commerce.orders o where o.id = order_id));

create function commerce.report_transfer(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; v_at timestamptz;
begin
  perform core.rate_limit('report_transfer', 10);
  select * into o from commerce.orders where id = core.guest_subject(p_token, 'order');
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy đơn'); end if;
  insert into commerce.payment_claims(entity_id, order_id) values (o.entity_id, o.id)
  on conflict (order_id) where status = 'reported' do update set reported_at = commerce.payment_claims.reported_at
  returning reported_at into v_at;
  perform core.enqueue(o.entity_id, 'payment.reported', 'payment.reported:' || o.id, o.id, jsonb_build_object('orderCode', o.code));
  return jsonb_build_object('reportedAt', v_at);
end $$;

-- ---------------------------------------------------------------- record payment (atomic)
create function commerce.can_record_payment(o commerce.orders) returns boolean language sql stable security definer set search_path = '' as $$
  select core.has_permission('payment.record', o.entity_id, o.location_id)
$$;

-- Re-allocate an expired/needs_review booking's room if free; never displaces another active allocation.
create function stay.try_reallocate(p_booking uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare b stay.bookings;
begin
  select * into b from stay.bookings where id = p_booking;
  perform 1 from stay.rooms where id = b.room_id for update;
  perform stay.expire_room_holds(b.room_id);
  if exists (select 1 from stay.room_allocations where source_id = b.id and active) then return true; end if;
  begin
    insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
    values (b.entity_id, b.location_id, b.room_id, stay.stay_range(b.location_id, b.arrival, b.departure), 'hold', b.id);
    return true;
  exception when exclusion_violation then
    return false;
  end;
end $$;

create function commerce.record_payment_atomic(p_order uuid, p_provider text, p_provider_ref text, p_amount bigint, p_received_at timestamptz,
  p_evidence_note text default null, p_evidence_id uuid default null, p_shift uuid default null, p_idempotency uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o commerce.orders; b stay.bookings; p commerce.payments; v_hash text; v_result jsonb;
  v_remaining bigint; v_alloc bigint; v_over bigint; v_state text; v_booking_state text; v_cash_account text; v_review text;
begin
  v_hash := md5(concat_ws('|', p_order, p_provider, p_provider_ref, p_amount));
  if p_amount is null or p_amount <= 0 then perform core.fail('VALIDATION', 'Số tiền phải lớn hơn 0'); end if;
  if coalesce(trim(p_provider_ref), '') = '' then perform core.fail('VALIDATION', 'Cần mã giao dịch hoặc số biên nhận'); end if;
  if p_provider in ('bank_transfer','vietqr_manual') and coalesce(trim(p_evidence_note), '') = '' and p_evidence_id is null then
    perform core.fail('VALIDATION', 'Chuyển khoản cần chứng cứ đối soát (sao kê/biên nhận ngân hàng). Ảnh khách gửi không đủ.');
  end if;

  -- Lock the order first: serialises concurrent confirmations of the same order.
  select * into o from commerce.orders where id = p_order for update;
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy đơn'); end if;
  if not commerce.can_record_payment(o) then perform core.fail('FORBIDDEN'); end if;

  if p_idempotency is not null then
    begin
      v_result := commerce.idem_get('payment', p_idempotency::text, v_hash);
    exception when sqlstate 'P0409' then
      perform core.fail('VERSION_CONFLICT', 'Khóa idempotency đã dùng cho một giao dịch khác');
    end;
    if v_result is not null then return v_result; end if;
  end if;

  -- Same provider reference = same money. Replays return the original effect.
  select * into p from commerce.payments where provider = p_provider and provider_ref = p_provider_ref;
  if found then
    if p.amount <> p_amount then perform core.fail('VERSION_CONFLICT', 'Mã giao dịch đã ghi với số tiền khác'); end if;
    select coalesce(b2.state, null) into v_booking_state from stay.bookings b2 where b2.order_id = o.id;
    v_result := jsonb_build_object('paymentId', p.id, 'orderId', o.id, 'state', case when p.state = 'needs_review' then 'needs_review' else 'allocated' end, 'bookingState', v_booking_state);
    if p_idempotency is not null then perform commerce.idem_put('payment', p_idempotency::text, v_hash, v_result); end if;
    return v_result;
  end if;

  insert into commerce.payments(entity_id, provider, provider_ref, amount, state, received_at, recorded_by, evidence_id, evidence_note, shift_id)
  values (o.entity_id, p_provider, p_provider_ref, p_amount, 'received', p_received_at, auth.uid(), p_evidence_id, p_evidence_note, p_shift)
  returning * into p;

  select * into b from stay.bookings where order_id = o.id for update;
  v_remaining := greatest(o.total - o.paid_amount, 0);
  v_state := 'allocated';

  if o.kind = 'stay' and found then
    if b.state in ('cancelled','checked_out','no_show') then
      v_review := 'Đơn đã kết thúc/hủy';
    elsif b.state in ('held','expired','needs_review') then
      if b.state = 'expired' or (b.state = 'held' and b.held_until <= now()) then
        if not stay.try_reallocate(b.id) then v_review := 'Tiền tới sau khi hết giữ chỗ và phòng đã có khách khác'; end if;
      end if;
    end if;
  elsif o.status in ('cancelled','expired') then
    v_review := 'Đơn đã hủy hoặc hết hạn';
  end if;

  v_cash_account := case p_provider when 'cash' then 'cash' when 'ota' then 'ota_clearing' when 'cod' then 'cod_clearing' else 'bank' end;

  if v_review is not null then
    -- Keep the money as an obligation to the customer; a manager decides re-booking or refund.
    update commerce.payments set state = 'needs_review', review_reason = v_review where id = p.id;
    update commerce.orders set status = 'needs_review' where id = o.id;
    if b.id is not null and b.state <> 'cancelled' then update stay.bookings set state = 'needs_review' where id = b.id; end if;
    perform commerce.post_ledger(o.entity_id, o.location_id, 'payment.received', 'payment:' || p.id, o.id, p.id,
      jsonb_build_array(jsonb_build_object('account', v_cash_account, 'amount', p_amount), jsonb_build_object('account', 'customer_credit', 'amount', -p_amount)));
    perform core.enqueue(o.entity_id, 'payment.review', 'payment.review:' || p.id, o.id, jsonb_build_object('orderCode', o.code, 'reason', v_review, 'amount', p_amount));
    v_state := 'needs_review';
    v_booking_state := (select state from stay.bookings where id = b.id);
  else
    v_alloc := least(p_amount, v_remaining);
    v_over := p_amount - v_alloc;
    if v_alloc > 0 then
      insert into commerce.payment_allocations(entity_id, payment_id, order_id, amount) values (o.entity_id, p.id, o.id, v_alloc);
    end if;
    update commerce.payments set state = 'allocated' where id = p.id;
    update commerce.orders set paid_amount = paid_amount + v_alloc,
      payment_status = case when paid_amount + v_alloc >= total then (case when v_over > 0 then 'overpaid' else 'paid' end) when paid_amount + v_alloc > 0 then 'partial' else payment_status end
    where id = o.id returning * into o;
    perform commerce.post_ledger(o.entity_id, o.location_id, 'payment.received', 'payment:' || p.id, o.id, p.id,
      jsonb_build_array(
        jsonb_build_object('account', v_cash_account, 'amount', p_amount),
        jsonb_build_object('account', 'deposit_liability', 'amount', -v_alloc),
        jsonb_build_object('account', 'customer_credit', 'amount', -v_over)));
    if v_over > 0 then
      perform core.enqueue(o.entity_id, 'payment.overpaid', 'payment.overpaid:' || p.id, o.id, jsonb_build_object('orderCode', o.code, 'overpaid', v_over));
    end if;

    if b.id is not null and b.state in ('held','expired','needs_review') then
      if o.paid_amount >= o.deposit_due then
        update stay.bookings set state = 'confirmed', held_until = null where id = b.id;
        update stay.room_allocations set kind = 'booking' where source_id = b.id and active;
        update commerce.orders set status = 'confirmed' where id = o.id;
        perform core.enqueue(o.entity_id, 'booking.confirmed', 'booking.confirmed:' || b.id, b.id, jsonb_build_object('orderCode', o.code));
        perform stay.schedule_journey(b.id);
        perform core.kick_notify(); -- async via pg_net after commit: confirmation email target < 60s
      else
        -- Underpaid deposit: keep the room while staff reconcile; no automatic credit.
        update stay.bookings set state = 'needs_review' where id = b.id;
        perform core.enqueue(o.entity_id, 'payment.review', 'payment.review:' || p.id, o.id, jsonb_build_object('orderCode', o.code, 'reason', 'Thiếu cọc', 'amount', p_amount));
        v_state := 'needs_review';
      end if;
    elsif o.kind <> 'stay' and o.paid_amount >= o.total and o.status = 'pending' then
      update commerce.orders set status = 'confirmed' where id = o.id;
    end if;
    v_booking_state := (select state from stay.bookings where id = b.id);
  end if;

  update commerce.payment_claims set status = 'matched', resolved_by = auth.uid(), resolved_at = now() where order_id = o.id and status = 'reported';
  perform core.audit(o.entity_id, 'payment.record', 'order', o.id::text,
    jsonb_build_object('provider', p_provider, 'amount', p_amount, 'state', v_state, 'evidence_note', p_evidence_note));

  v_result := jsonb_build_object('paymentId', p.id, 'orderId', o.id, 'state', v_state, 'bookingState', v_booking_state);
  if p_idempotency is not null then perform commerce.idem_put('payment', p_idempotency::text, v_hash, v_result); end if;
  return v_result;
end $$;

-- Journey notifications (T07 consumes): handbook 24h before arrival (or now if sooner), thanks 24h after checkout.
create function stay.schedule_journey(p_booking uuid) returns void language plpgsql security definer set search_path = '' as $$
declare b stay.bookings; l core.locations; v_arrival timestamptz; v_hours int;
begin
  select * into b from stay.bookings where id = p_booking;
  select * into l from core.locations where id = b.location_id;
  v_hours := coalesce((b.policy_snapshot -> 'params' ->> 'handbook_hours_before')::int, 24);
  v_arrival := (b.arrival + l.check_in_time) at time zone l.timezone;
  perform core.enqueue(b.entity_id, 'handbook.due', 'handbook.due:' || b.id || ':' || b.arrival, b.id, '{}'::jsonb,
    greatest(now(), v_arrival - make_interval(hours => v_hours)));
end $$;

-- Manager exception: confirm an underpaid booking with an explicit due amount and reason.
create function stay.confirm_with_exception(p_booking uuid, p_reason text, p_due bigint) returns void language plpgsql security definer set search_path = '' as $$
declare b stay.bookings; o commerce.orders;
begin
  select * into b from stay.bookings where id = p_booking for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not core.has_permission('booking.exception', b.entity_id, b.location_id) then perform core.fail('FORBIDDEN'); end if;
  if coalesce(trim(p_reason), '') = '' or p_due is null or p_due < 0 then perform core.fail('VALIDATION', 'Cần lý do và số tiền còn phải thu'); end if;
  if b.state not in ('held','needs_review') then perform core.fail('INVALID_TRANSITION'); end if;
  if not stay.try_reallocate(b.id) then perform core.fail('SOLD_OUT', 'Phòng đã có khách khác trong khoảng ngày này'); end if;
  update stay.bookings set state = 'confirmed', held_until = null where id = b.id;
  update stay.room_allocations set kind = 'booking' where source_id = b.id and active;
  update commerce.orders set status = 'confirmed', policy_snapshot = policy_snapshot || jsonb_build_object('exception', jsonb_build_object('reason', p_reason, 'due', p_due, 'by', auth.uid(), 'at', now()))
  where id = b.order_id returning * into o;
  perform core.enqueue(b.entity_id, 'booking.confirmed', 'booking.confirmed:' || b.id, b.id, jsonb_build_object('orderCode', o.code));
  perform stay.schedule_journey(b.id);
  perform core.audit(b.entity_id, 'booking.exception', 'booking', b.id::text, jsonb_build_object('due', p_due), p_reason);
end $$;

-- ---------------------------------------------------------------- refunds (request -> approve with payout evidence)
create function commerce.request_refund(p_order uuid, p_amount bigint, p_reason text) returns uuid language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; v_id uuid;
begin
  select * into o from commerce.orders where id = p_order for update;
  if not found then perform core.fail('NOT_FOUND'); end if;
  if not commerce.can_record_payment(o) and not core.has_permission('orders.manage', o.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if p_amount <= 0 or coalesce(trim(p_reason), '') = '' then perform core.fail('VALIDATION', 'Cần số tiền và lý do hoàn'); end if;
  insert into commerce.refund_requests(entity_id, order_id, amount, reason, requested_by) values (o.entity_id, o.id, p_amount, p_reason, auth.uid()) returning id into v_id;
  perform core.audit(o.entity_id, 'refund.request', 'order', o.id::text, jsonb_build_object('amount', p_amount), p_reason);
  return v_id;
end $$;

create function commerce.approve_refund(p_refund uuid, p_provider_ref text, p_evidence_note text, p_method text default 'bank') returns void
language plpgsql security definer set search_path = '' as $$
declare r commerce.refund_requests; o commerce.orders; v_credit bigint; v_from_credit bigint;
begin
  select * into r from commerce.refund_requests where id = p_refund for update;
  if not found or r.status <> 'requested' then perform core.fail('INVALID_TRANSITION'); end if;
  select * into o from commerce.orders where id = r.order_id for update;
  if not core.has_permission('refund.approve', r.entity_id, null) then perform core.fail('FORBIDDEN'); end if;
  if r.requested_by = auth.uid() then perform core.fail('FORBIDDEN', 'Người yêu cầu không tự duyệt hoàn tiền'); end if;
  if coalesce(trim(p_provider_ref), '') = '' or coalesce(trim(p_evidence_note), '') = '' then perform core.fail('VALIDATION', 'Cần mã giao dịch hoàn và chứng cứ'); end if;
  -- Refund customer credit first, then the deposit liability tied to this order.
  select coalesce(-sum(e.amount), 0) into v_credit from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id
   where v.order_id = o.id and e.account = 'customer_credit';
  v_from_credit := least(v_credit, r.amount);
  update commerce.refund_requests set status = 'paid', approved_by = auth.uid(), approved_at = now(), evidence_note = p_evidence_note where id = r.id;
  update commerce.orders set paid_amount = greatest(paid_amount - (r.amount - v_from_credit), 0),
    payment_status = case when paid_amount - (r.amount - v_from_credit) <= 0 then 'refunded' else 'partial' end
  where id = o.id and r.amount > v_from_credit;
  perform commerce.post_ledger(r.entity_id, o.location_id, 'refund.paid', 'refund:' || r.id, o.id, null,
    jsonb_build_array(
      jsonb_build_object('account', 'customer_credit', 'amount', v_from_credit),
      jsonb_build_object('account', 'deposit_liability', 'amount', r.amount - v_from_credit),
      jsonb_build_object('account', case p_method when 'cash' then 'cash' else 'bank' end, 'amount', -r.amount)));
  perform core.audit(r.entity_id, 'refund.approve', 'order', o.id::text, jsonb_build_object('amount', r.amount, 'provider_ref', p_provider_ref), p_evidence_note);
end $$;

-- ---------------------------------------------------------------- guest receipt (projection, no PII beyond the guest's own name)
create function commerce.get_guest_receipt(p_token text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o commerce.orders; b stay.bookings; r stay.rooms; l core.locations; v_qr jsonb; v_cfg jsonb; v_lines jsonb; v_claim timestamptz;
begin
  select * into o from commerce.orders where id = core.guest_subject(p_token, 'order');
  if not found then perform core.fail('NOT_FOUND', 'Không tìm thấy đơn hoặc liên kết đã hết hạn'); end if;
  select * into b from stay.bookings where order_id = o.id;
  if b.id is not null then
    select * into r from stay.rooms where id = b.room_id;
    select * into l from core.locations where id = b.location_id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('title', i.title, 'amount', i.amount::text) order by i.created_at), '[]') into v_lines
  from commerce.order_items i where i.order_id = o.id and i.status <> 'cancelled';
  select max(reported_at) into v_claim from commerce.payment_claims where order_id = o.id;
  select value into v_cfg from ops_config.runtime_settings where key = 'payment.vietqr';
  if coalesce((v_cfg ->> 'approved')::boolean, false) and o.paid_amount < greatest(o.deposit_due, case when o.kind = 'stay' then 0 else o.total end) then
    v_qr := jsonb_build_object('bankBin', v_cfg ->> 'bankBin', 'bankName', v_cfg ->> 'bankName', 'accountNo', v_cfg ->> 'accountNo', 'accountName', v_cfg ->> 'accountName',
      'amount', (greatest(case when o.kind = 'stay' then o.deposit_due else o.total end - o.paid_amount, 0))::text, 'reference', 'ZS' || o.code);
  end if;
  return jsonb_build_object(
    'orderId', o.id, 'orderCode', o.code, 'kind', o.kind, 'status', o.status, 'paymentStatus', o.payment_status,
    'total', o.total::text, 'depositDue', o.deposit_due::text, 'paid', o.paid_amount::text, 'due', greatest(o.total - o.paid_amount, 0)::text,
    'dueAt', o.due_at, 'guestName', o.contact_snapshot ->> 'name', 'lines', v_lines, 'transferReportedAt', v_claim, 'vietqr', v_qr,
    'policySummary', coalesce(o.policy_snapshot ->> 'summary', ''),
    'booking', case when b.id is null then null else jsonb_build_object('id', b.id, 'state', b.state, 'roomName', r.name, 'arrival', b.arrival, 'departure', b.departure,
      'adults', b.adults, 'children', coalesce(array_length(b.children_ages, 1), 0), 'heldUntil', b.held_until,
      'checkIn', to_char(l.check_in_time, 'HH24:MI'), 'checkOut', to_char(l.check_out_time, 'HH24:MI')) end);
end $$;

-- Verified account claims a guest order: possession of the capability + verified email equal to the order contact.
create function commerce.claim_order(p_token text) returns void language plpgsql security definer set search_path = '' as $$
declare o commerce.orders; v_email text; v_verified timestamptz;
begin
  if auth.uid() is null then perform core.fail('UNAUTHENTICATED'); end if;
  select * into o from commerce.orders where id = core.guest_subject(p_token, 'order');
  if not found then perform core.fail('NOT_FOUND'); end if;
  select lower(email), email_confirmed_at into v_email, v_verified from auth.users where id = auth.uid();
  if v_verified is null or v_email is distinct from lower(o.contact_snapshot ->> 'email') then
    perform core.fail('FORBIDDEN', 'Email tài khoản đã xác minh phải trùng email của đơn');
  end if;
  update core.customers set user_id = auth.uid() where id = o.customer_id and user_id is null;
  perform core.audit(o.entity_id, 'order.claim', 'order', o.id::text, '{}'::jsonb);
end $$;

revoke execute on function commerce.exchange_guest_token, commerce.report_transfer, commerce.can_record_payment, stay.try_reallocate,
  commerce.record_payment_atomic, stay.schedule_journey, stay.confirm_with_exception, commerce.request_refund, commerce.approve_refund,
  commerce.get_guest_receipt, commerce.claim_order from public;
grant execute on function commerce.exchange_guest_token, commerce.report_transfer, commerce.get_guest_receipt to anon, authenticated;
grant execute on function commerce.record_payment_atomic, stay.confirm_with_exception, commerce.request_refund, commerce.approve_refund, commerce.claim_order to authenticated;
